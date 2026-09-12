from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Application,
    Campaign,
    Deliverable,
    Payment,
    Rating,
)
from app.schemas.workspace import (
    CollabResponse,
    DeliverableCreate,
    DeliverableSubmit,
    DeliverableReview,
    DeliverableResponse,
)
from app.dependencies.auth import (
    get_current_user,
    get_current_business,
    get_current_creator,
)
from app.services.notifications import create_notification


router = APIRouter(
    prefix="/api/workspace",
    tags=["Workspace"],
)


# ============================================================
# HELPERS
# ============================================================

def _accepted_collab_query(
    db: Session,
    current_user: User,
):
    """
    Return active accepted collaborations for the current user.
    """

    query = db.query(Application).filter(
        Application.status == "accepted"
    )

    if current_user.role == "creator":
        query = query.filter(
            Application.creator_id == current_user.id
        )

    elif current_user.role == "business":
        campaign_ids = select(Campaign.id).where(
            Campaign.business_id == current_user.id
        )

        query = query.filter(
            Application.campaign_id.in_(campaign_ids)
        )

    else:
        query = query.filter(False)

    return query


def _get_authorized_collab(
    db: Session,
    current_user: User,
    collab_id: int,
) -> Application:
    """
    Get a collaboration and verify that the current user
    belongs to it.
    """

    application = (
        db.query(Application)
        .filter(Application.id == collab_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Collaboration not found",
        )

    if application.status not in (
        "accepted",
        "completed",
    ):
        raise HTTPException(
            status_code=404,
            detail="Collaboration not found",
        )

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == application.campaign_id
        )
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    is_creator_party = (
        current_user.role == "creator"
        and application.creator_id == current_user.id
    )

    is_business_party = (
        current_user.role == "business"
        and campaign.business_id == current_user.id
    )

    if not (
        is_creator_party
        or is_business_party
    ):
        raise HTTPException(
            status_code=403,
            detail="You're not part of this collaboration",
        )

    return application


def _campaign_type_value(
    campaign: Optional[Campaign],
) -> Optional[str]:
    """
    Safely return campaign type as a string.
    """

    if not campaign:
        return None

    campaign_type = getattr(
        campaign,
        "campaign_type",
        None,
    )

    if campaign_type is None:
        return None

    return getattr(
        campaign_type,
        "value",
        str(campaign_type),
    )


def _profile_value(
    user: Optional[User],
    key: str,
) -> Optional[str]:
    """
    Safely read a value from User.profile.
    """

    if not user:
        return None

    profile = getattr(
        user,
        "profile",
        None,
    )

    if not isinstance(profile, dict):
        return None

    value = profile.get(key)

    if value is None:
        return None

    return str(value)


def _creator_display_name(
    creator: Optional[User],
) -> Optional[str]:
    if not creator:
        return None

    return (
        _profile_value(
            creator,
            "display_name",
        )
        or getattr(
            creator,
            "full_name",
            None,
        )
    )


def _business_display_name(
    business: Optional[User],
) -> Optional[str]:
    if not business:
        return None

    return (
        _profile_value(
            business,
            "company_name",
        )
        or getattr(
            business,
            "full_name",
            None,
        )
    )


# ============================================================
# COLLABORATION RESPONSE
# ============================================================

def _collab_to_response(
    db: Session,
    application: Application,
    viewer_id: Optional[int] = None,
) -> CollabResponse:
    """
    Convert an Application into CollabResponse.

    No messaging.
    No calendar.
    No gifted campaign logic.
    """

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == application.campaign_id
        )
        .first()
    )

    business = None

    if campaign:
        business = (
            db.query(User)
            .filter(
                User.id == campaign.business_id
            )
            .first()
        )

    creator = (
        db.query(User)
        .filter(
            User.id == application.creator_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Deliverables
    # --------------------------------------------------------

    deliverables = (
        db.query(Deliverable)
        .filter(
            Deliverable.application_id
            == application.id
        )
        .all()
    )

    pending_deliverables = sum(
        1
        for deliverable in deliverables
        if deliverable.status
        in (
            "pending",
            "revision_requested",
        )
    )

    submitted_deliverables = sum(
        1
        for deliverable in deliverables
        if deliverable.status == "submitted"
    )

    approved_deliverables = sum(
        1
        for deliverable in deliverables
        if deliverable.status == "approved"
    )

    # --------------------------------------------------------
    # Payments
    # --------------------------------------------------------

    latest_payment = (
        db.query(Payment)
        .filter(
            Payment.application_id
            == application.id
        )
        .order_by(
            Payment.created_at.desc()
        )
        .first()
    )

    campaign_funding = None

    if (
        campaign
        and getattr(
            campaign,
            "funding_status",
            "unfunded",
        )
        == "funded"
    ):
        campaign_funding = (
            db.query(Payment)
            .filter(
                Payment.campaign_id
                == campaign.id,

                Payment.payment_type
                == "campaign_funding",

                Payment.status.in_(
                    [
                        "funded",
                        "completed",
                        "released",
                    ]
                ),
            )
            .order_by(
                Payment.created_at.desc()
            )
            .first()
        )

    if (
        not latest_payment
        and campaign_funding
    ):
        latest_payment = campaign_funding

    # --------------------------------------------------------
    # Effective payment status
    # --------------------------------------------------------

    if (
        latest_payment
        and latest_payment.status
        == "released"
    ):
        effective_payment_status = "released"

    elif campaign_funding:
        effective_payment_status = "funded"

    elif latest_payment:
        effective_payment_status = (
            latest_payment.status
        )

    else:
        effective_payment_status = None

    # --------------------------------------------------------
    # Funded amount
    # --------------------------------------------------------

    campaign_funded_amount = (
        getattr(
            campaign,
            "funded_amount",
            None,
        )
        if campaign
        else None
    )

    if campaign_funded_amount is not None:
        funded_amount = float(
            campaign_funded_amount
        )

    elif campaign_funding:
        funded_amount = float(
            campaign_funding.amount
        )

    else:
        funded_amount = None

    # --------------------------------------------------------
    # Rating
    # --------------------------------------------------------

    already_rated = (
        db.query(Rating)
        .filter(
            Rating.application_id
            == application.id
        )
        .first()
        is not None
    )

    # --------------------------------------------------------
    # Multi-platform campaign requirements
    # --------------------------------------------------------

    required_platforms = (
        getattr(
            campaign,
            "required_platforms",
            None,
        )
        if campaign
        else None
    )

    required_post_types = (
        getattr(
            campaign,
            "required_post_types",
            None,
        )
        if campaign
        else None
    )

    # Keep arrays as arrays.
    if (
        required_platforms is not None
        and not isinstance(
            required_platforms,
            list,
        )
    ):
        try:
            required_platforms = list(
                required_platforms
            )
        except TypeError:
            required_platforms = None

    if (
        required_post_types is not None
        and not isinstance(
            required_post_types,
            list,
        )
    ):
        try:
            required_post_types = list(
                required_post_types
            )
        except TypeError:
            required_post_types = None

    # --------------------------------------------------------
    # Legacy fields
    # --------------------------------------------------------

    required_platform = (
        getattr(
            campaign,
            "required_platform",
            None,
        )
        if campaign
        else None
    )

    required_post_type = (
        getattr(
            campaign,
            "required_post_type",
            None,
        )
        if campaign
        else None
    )

    # --------------------------------------------------------
    # Deadlines
    # --------------------------------------------------------

    publication_deadline = (
        getattr(
            campaign,
            "publication_deadline",
            None,
        )
        if campaign
        else None
    )

    campaign_deliverable_deadline = (
        getattr(
            campaign,
            "deliverable_deadline",
            None,
        )
        if campaign
        else None
    )

    application_deliverable_deadline = (
        getattr(
            application,
            "deliverable_deadline",
            None,
        )
    )

    deliverable_deadline = (
        application_deliverable_deadline
        or campaign_deliverable_deadline
    )

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    return CollabResponse(
        id=application.id,

        campaign_id=application.campaign_id,

        campaign_title=(
            campaign.title
            if campaign
            else None
        ),

        business_id=(
            campaign.business_id
            if campaign
            else 0
        ),

        business_name=(
            _business_display_name(
                business
            )
        ),

        business_logo=(
            _profile_value(
                business,
                "logo_url",
            )
        ),

        creator_id=application.creator_id,

        creator_name=(
            _creator_display_name(
                creator
            )
        ),

        creator_avatar=(
            _profile_value(
                creator,
                "profile_image",
            )
        ),

        rate=(
            float(application.rate)
            if application.rate is not None
            else None
        ),

        agreed_rate=(
            float(application.agreed_rate)
            if application.agreed_rate is not None
            else None
        ),

        rate_locked=bool(
            getattr(
                application,
                "rate_locked",
                False,
            )
        ),

        status=application.status,

        created_at=application.created_at,

        creator_confirmed=bool(
            getattr(
                application,
                "creator_confirmed",
                False,
            )
        ),


        pending_deliverables=(
            pending_deliverables
        ),

        payment_status=(
            effective_payment_status
        ),

        funded_amount=funded_amount,

        amount_paid=(
            float(latest_payment.amount)
            if (
                latest_payment
                and latest_payment.status
                == "released"
            )
            else None
        ),

        rated=already_rated,

        campaign_type=(
            _campaign_type_value(
                campaign
            )
        ),

        completion_mode=(
            getattr(
                campaign,
                "completion_mode",
                "approval_only",
            )
            if campaign
            else "approval_only"
        ),

        # ----------------------------------------------------
        # MULTI-PLATFORM
        # ----------------------------------------------------

        required_platforms=(
            required_platforms
        ),

        required_post_types=(
            required_post_types
        ),

        # Legacy compatibility fields.
        required_platform=(
            required_platform
        ),

        required_post_type=(
            required_post_type
        ),

        publication_deadline=(
            publication_deadline
        ),

        deliverable_deadline=(
            deliverable_deadline
        ),

        total_deliverables=len(
            deliverables
        ),

        submitted_deliverables=(
            submitted_deliverables
        ),

        approved_deliverables=(
            approved_deliverables
        ),
    )


# ============================================================
# AUTOMATIC CREATOR PAYOUT
# ============================================================

def _release_creator_payout_after_approval(
    db: Session,
    application: Application,
    campaign: Campaign,
) -> Optional[Payment]:
    """Release the creator payout immediately after the brand approves all deliverables."""
    if not application or not campaign:
        return None

    campaign_type = getattr(campaign.campaign_type, "value", str(campaign.campaign_type))
    if campaign_type != "paid" or getattr(campaign, "funding_status", "unfunded") != "funded":
        return None

    deliverables = db.query(Deliverable).filter(
        Deliverable.application_id == application.id
    ).all()
    if not deliverables or not all(d.status == "approved" for d in deliverables):
        return None

    existing = db.query(Payment).filter(
        Payment.application_id == application.id,
        Payment.payment_type == "creator_payout",
        Payment.status == "released",
    ).order_by(Payment.created_at.desc()).first()
    if existing:
        return existing

    funding = db.query(Payment).filter(
        Payment.campaign_id == campaign.id,
        Payment.payment_type == "campaign_funding",
        Payment.status.in_(["funded", "completed", "released"]),
    ).order_by(Payment.created_at.desc()).first()
    if not funding:
        raise HTTPException(status_code=400, detail="The campaign budget must be funded before payment can be released.")

    agreed = float(application.agreed_rate or application.rate or campaign.budget or 0)
    if agreed <= 0:
        raise HTTPException(status_code=400, detail="A valid campaign payment amount is required before payment can be released.")

    already_allocated = float(
        db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.campaign_id == campaign.id,
            Payment.payment_type == "creator_payout",
            Payment.status == "released",
        ).scalar() or 0
    )
    available = float(funding.amount) - already_allocated
    if agreed > available + 0.01:
        raise HTTPException(status_code=400, detail="The campaign does not have enough remaining funded budget for this creator payout.")

    fee = round(agreed * 0.10, 2)
    creator_amount = round(agreed - fee, 2)
    if creator_amount <= 0:
        raise HTTPException(status_code=400, detail="Creator payout must be greater than zero.")

    now = datetime.now(timezone.utc)
    payout = Payment(
        application_id=application.id,
        campaign_id=campaign.id,
        payment_type="creator_payout",
        purchase_order_id=f"PAYOUT{application.id}-{int(now.timestamp())}-{uuid4().hex[:6].upper()}",
        amount=creator_amount,
        platform_fee=fee,
        creator_payout=creator_amount,
        status="released",
        method="platform_ledger",
        initiated_by=campaign.business_id,
        transaction_id=f"PAYOUT-{uuid4().hex[:12].upper()}",
        paid_at=now,
    )
    db.add(payout)
    application.status = "completed"

    create_notification(
        db,
        user_id=application.creator_id,
        type="payment_released",
        title="Payment successful",
        message=f"Rs. {creator_amount:,.2f} has been paid to you for {campaign.title} after the brand approved your deliverables.",
        link=f"/workspace/active?collab={application.id}",
        reference_id=application.id,
        event_key=f"payment-released:{application.id}",
    )
    create_notification(
        db,
        user_id=campaign.business_id,
        type="collaboration_completed",
        title="Payment successful",
        message=f"Rs. {creator_amount:,.2f} was paid to the creator for {campaign.title}. The approved collaboration is now complete.",
        link=f"/workspace/active?collab={application.id}",
        reference_id=application.id,
        event_key=f"collaboration-completed:{application.id}",
    )

    db.flush()
    _maybe_complete_campaign(db, campaign)
    return payout


# ============================================================
# CAMPAIGN COMPLETION
# ============================================================

def _maybe_complete_campaign(
    db: Session,
    campaign: Campaign,
):
    """
    Mark campaign as completed when all required
    creator collaborations are completed.
    """

    required = (
        getattr(
            campaign,
            "creators_needed",
            None,
        )
        or 1
    )

    selected = (
        db.query(Application)
        .filter(
            Application.campaign_id
            == campaign.id,

            Application.status.in_(
                [
                    "accepted",
                    "completed",
                ]
            ),
        )
        .all()
    )

    completed = [
        application
        for application in selected
        if application.status
        == "completed"
    ]

    if (
        len(selected) >= required
        and len(completed) >= required
    ):

        campaign.status = "completed"

        if hasattr(
            campaign,
            "is_active",
        ):
            campaign.is_active = False

        create_notification(
            db,
            user_id=campaign.business_id,
            type="campaign_completed",
            title="Campaign completed",
            message=(
                "All creator collaborations "
                f"for {campaign.title} are complete."
            ),
            link="/workspace/history",
            event_key=(
                f"campaign-completed:"
                f"{campaign.id}"
            ),
        )

        db.commit()


# ============================================================
# ACTIVE COLLABORATIONS
# ============================================================

@router.get(
    "/collabs",
    response_model=list[CollabResponse],
)
async def get_collabs(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    applications = (
        _accepted_collab_query(
            db,
            current_user,
        )
        .order_by(
            Application.updated_at.desc()
        )
        .all()
    )

    return [
        _collab_to_response(
            db,
            application,
            current_user.id,
        )
        for application in applications
    ]


@router.post(
    "/collabs/{collab_id}/confirm",
    response_model=CollabResponse,
)
async def confirm_collaboration(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_creator
    ),
):
    application = _get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    if application.status != "accepted":
        raise HTTPException(
            status_code=400,
            detail=(
                "This collaboration is "
                "no longer active."
            ),
        )

    if getattr(
        application,
        "creator_confirmed",
        False,
    ):
        return _collab_to_response(
            db,
            application,
            current_user.id,
        )

    application.creator_confirmed = True

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id
            == application.campaign_id
        )
        .first()
    )

    if campaign:

        creator_name = (
            _creator_display_name(
                current_user
            )
            or "The creator"
        )

        create_notification(
            db,
            user_id=campaign.business_id,
            type="creator_confirmed",
            title=(
                "Creator confirmed "
                "the collaboration"
            ),
            message=(
                f"{creator_name} confirmed "
                f"{campaign.title} and can now "
                "begin work."
            ),
            link=(
                "/workspace/active?"
                f"collab={application.id}"
            ),
            reference_id=application.id,
            event_key=(
                f"creator-confirmed:"
                f"{application.id}"
            ),
        )

    db.commit()
    db.refresh(application)

    return _collab_to_response(
        db,
        application,
        current_user.id,
    )


# ============================================================
# HISTORY
# ============================================================

@router.get(
    "/history",
    response_model=list[CollabResponse],
)
async def get_collab_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Completed or withdrawn collaborations.
    """

    query = (
        db.query(Application)
        .filter(
            Application.status.in_(
                [
                    "completed",
                    "withdrawn",
                ]
            )
        )
    )

    if current_user.role == "creator":

        query = query.filter(
            Application.creator_id
            == current_user.id
        )

    elif current_user.role == "business":

        campaign_ids = select(
            Campaign.id
        ).where(
            Campaign.business_id
            == current_user.id
        )

        query = query.filter(
            Application.campaign_id.in_(
                campaign_ids
            )
        )

    else:
        query = query.filter(False)

    applications = (
        query
        .order_by(
            Application.updated_at.desc(),
            Application.created_at.desc(),
        )
        .all()
    )

    return [
        _collab_to_response(
            db,
            application,
            current_user.id,
        )
        for application in applications
    ]


# ============================================================
# DELIVERABLE HELPERS
# ============================================================

def _deliverable_to_response(
    db: Session,
    deliverable: Deliverable,
) -> DeliverableResponse:
    """
    Convert Deliverable to API response.

    No calendar dependency.
    """

    application = (
        db.query(Application)
        .filter(
            Application.id
            == deliverable.application_id
        )
        .first()
    )

    campaign = None

    if application:

        campaign = (
            db.query(Campaign)
            .filter(
                Campaign.id
                == application.campaign_id
            )
            .first()
        )

    other_party_name = None

    if application:

        creator = (
            db.query(User)
            .filter(
                User.id
                == application.creator_id
            )
            .first()
        )

        business = None

        if campaign:

            business = (
                db.query(User)
                .filter(
                    User.id
                    == campaign.business_id
                )
                .first()
            )

        if business:

            other_party_name = (
                _business_display_name(
                    business
                )
            )

        if (
            other_party_name is None
            and creator
        ):

            other_party_name = (
                _creator_display_name(
                    creator
                )
            )

    return DeliverableResponse(
        id=deliverable.id,

        application_id=(
            deliverable.application_id
        ),

        campaign_title=(
            campaign.title
            if campaign
            else None
        ),

        other_party_name=(
            other_party_name
        ),

        title=deliverable.title,

        description=(
            deliverable.description
        ),

        due_date=deliverable.due_date,

        status=deliverable.status,

        file_url=deliverable.file_url,

        media_type=deliverable.media_type,

        submission_note=(
            deliverable.submission_note
        ),

        feedback=deliverable.feedback,

        submitted_at=(
            deliverable.submitted_at
        ),

        created_at=deliverable.created_at,

        updated_at=(
            deliverable.updated_at
        ),
    )


# ============================================================
# GET DELIVERABLES
# ============================================================

@router.get(
    "/deliverables",
    response_model=list[DeliverableResponse],
)
async def get_deliverables(
    collab_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Get deliverables.

    With collab_id:
        Get deliverables for one collaboration.

    Without collab_id:
        Get deliverables for all active
        collaborations.
    """

    if collab_id is not None:

        _get_authorized_collab(
            db,
            current_user,
            collab_id,
        )

        deliverables = (
            db.query(Deliverable)
            .filter(
                Deliverable.application_id
                == collab_id
            )
            .order_by(
                Deliverable.created_at.desc()
            )
            .all()
        )

    else:

        collab_ids = [
            collaboration.id
            for collaboration
            in _accepted_collab_query(
                db,
                current_user,
            ).all()
        ]

        if collab_ids:

            deliverables = (
                db.query(Deliverable)
                .filter(
                    Deliverable.application_id.in_(
                        collab_ids
                    )
                )
                .order_by(
                    Deliverable.created_at.desc()
                )
                .all()
            )

        else:

            deliverables = []

    return [
        _deliverable_to_response(
            db,
            deliverable,
        )
        for deliverable in deliverables
    ]


# ============================================================
# CREATE DELIVERABLE
# ============================================================

@router.post(
    "/deliverables",
    response_model=DeliverableResponse,
)
async def create_deliverable(
    data: DeliverableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_business
    ),
):
    """
    Business creates a deliverable requirement
    for a creator.

    Calendar functionality has been removed.
    The due date is still stored directly on
    the deliverable.
    """

    application = _get_authorized_collab(
        db,
        current_user,
        data.collab_id,
    )

    deliverable = Deliverable(
        application_id=application.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status="pending",
    )

    db.add(deliverable)
    db.commit()
    db.refresh(deliverable)

    create_notification(
        db,
        user_id=application.creator_id,
        type="deliverable_requested",
        title="New deliverable requested",
        message=(
            f"The brand requested: "
            f"{deliverable.title}."
        ),
        link=(
            "/workspace/deliverables?"
            f"collab={application.id}"
        ),
        event_key=(
            f"deliverable-requested:"
            f"{deliverable.id}"
        ),
    )

    db.commit()

    return _deliverable_to_response(
        db,
        deliverable,
    )


# ============================================================
# SUBMIT DELIVERABLE
# ============================================================

@router.put(
    "/deliverables/{deliverable_id}/submit",
    response_model=DeliverableResponse,
)
async def submit_deliverable(
    deliverable_id: int,
    data: DeliverableSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_creator
    ),
):
    """
    Creator submits an image or video deliverable.
    """

    deliverable = (
        db.query(Deliverable)
        .filter(
            Deliverable.id
            == deliverable_id
        )
        .first()
    )

    if not deliverable:

        raise HTTPException(
            status_code=404,
            detail="Deliverable not found",
        )

    application = _get_authorized_collab(
        db,
        current_user,
        deliverable.application_id,
    )

    if application.creator_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="Not your deliverable",
        )

    if deliverable.status not in (
        "pending",
        "revision_requested",
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This deliverable is not "
                "awaiting a submission."
            ),
        )

    if data.media_type not in (
        "image",
        "video",
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "A real image or video upload "
                "is required."
            ),
        )

    if (
        not data.file_url
        or not data.file_url.strip()
        or "/static/uploads/"
        not in data.file_url
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "A real image or video upload "
                "from this platform is required."
            ),
        )

    # --------------------------------------------------------
    # Campaign funding
    # --------------------------------------------------------

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id
            == application.campaign_id
        )
        .first()
    )

    campaign_type = _campaign_type_value(
        campaign
    )

    if campaign_type == "paid":

        secured = (
            db.query(Payment)
            .filter(
                Payment.campaign_id
                == campaign.id,

                Payment.payment_type
                == "campaign_funding",

                Payment.status.in_(
                    [
                        "funded",
                        "released",
                        "completed",
                    ]
                ),
            )
            .first()
        )

        if not secured:

            raise HTTPException(
                status_code=400,
                detail=(
                    "The brand must fund the "
                    "campaign before you can "
                    "start this deliverable."
                ),
            )

    # --------------------------------------------------------
    # Save submission
    # --------------------------------------------------------

    deliverable.file_url = (
        data.file_url.strip()
    )

    deliverable.media_type = (
        data.media_type
    )

    deliverable.submission_note = (
        data.submission_note
    )

    deliverable.status = "submitted"

    deliverable.submitted_at = (
        datetime.now(timezone.utc)
    )

    deliverable.feedback = None

    db.commit()

    # Reload application and campaign.
    application = (
        db.query(Application)
        .filter(
            Application.id
            == deliverable.application_id
        )
        .first()
    )

    campaign = None

    if application:

        campaign = (
            db.query(Campaign)
            .filter(
                Campaign.id
                == application.campaign_id
            )
            .first()
        )

    # --------------------------------------------------------
    # Notify business
    # --------------------------------------------------------

    if campaign:

        create_notification(
            db,
            user_id=campaign.business_id,
            type="deliverable_submitted",
            title=(
                "Creator submitted "
                "a deliverable"
            ),
            message=(
                f"{deliverable.title} "
                "is ready for your review."
            ),
            link=(
                "/workspace/deliverables?"
                f"collab={deliverable.application_id}"
            ),
            event_key=(
                f"deliverable-submitted:"
                f"{deliverable.id}:"
                f"{deliverable.submitted_at.isoformat()}"
            ),
        )

    db.commit()
    db.refresh(deliverable)

    return _deliverable_to_response(db, deliverable)


# ============================================================
# REVIEW DELIVERABLE
# ============================================================

@router.put(
    "/deliverables/{deliverable_id}/review",
    response_model=DeliverableResponse,
)
async def review_deliverable(
    deliverable_id: int,
    data: DeliverableReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_business
    ),
):
    """
    Business approves a deliverable or
    requests a revision.
    """

    if data.status not in (
        "approved",
        "revision_requested",
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be "
                "'approved' or "
                "'revision_requested'"
            ),
        )

    deliverable = (
        db.query(Deliverable)
        .filter(
            Deliverable.id
            == deliverable_id
        )
        .first()
    )

    if not deliverable:

        raise HTTPException(
            status_code=404,
            detail="Deliverable not found",
        )

    application = _get_authorized_collab(
        db,
        current_user,
        deliverable.application_id,
    )

    if deliverable.status != "submitted":

        raise HTTPException(
            status_code=400,
            detail=(
                "Deliverable hasn't been "
                "submitted yet"
            ),
        )

    if (
        not deliverable.file_url
        or deliverable.media_type
        not in (
            "image",
            "video",
        )
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This deliverable has no valid "
                "image/video submission to review."
            ),
        )

    deliverable.status = data.status

    deliverable.feedback = (
        data.feedback
        if data.status
        == "revision_requested"
        else None
    )

    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id
            == application.campaign_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Notify creator
    # --------------------------------------------------------

    if campaign:

        if data.status == "approved":

            create_notification(
                db,
                user_id=application.creator_id,
                type="deliverable_approved",
                title="Deliverable approved",
                message=(
                    f"{deliverable.title} "
                    "was approved by the brand."
                ),
                link=(
                    "/workspace/active?"
                    f"collab={application.id}"
                ),
                event_key=(
                    f"deliverable-approved:"
                    f"{deliverable.id}"
                ),
            )

        else:

            create_notification(
                db,
                user_id=application.creator_id,
                type="revision_requested",
                title="Revision requested",
                message=(
                    f"The brand requested "
                    f"changes to "
                    f"{deliverable.title}."
                ),
                link=(
                    "/workspace/active?"
                    f"collab={application.id}"
                ),
                event_key=(
                    f"revision-requested:"
                    f"{deliverable.id}"
                ),
            )

    # --------------------------------------------------------
    # Final brand approval releases payment immediately.
    # --------------------------------------------------------
    payout = None
    all_deliverables = (
        db.query(Deliverable)
        .filter(Deliverable.application_id == application.id)
        .all()
    )
    if data.status == "approved" and all_deliverables and all(
        item.status == "approved" for item in all_deliverables
    ):
        payout = _release_creator_payout_after_approval(db, application, campaign)

    db.commit()
    db.refresh(deliverable)

    response = _deliverable_to_response(db, deliverable)
    response.payment_released = payout is not None
    response.payment_amount = float(payout.amount) if payout else None
    response.payment_id = payout.id if payout else None
    return response


# ============================================================
# REVIEW ALL DELIVERABLES
# ============================================================

@router.put(
    "/deliverables/review-all",
    response_model=list[DeliverableResponse],
)
async def review_all_deliverables(
    data: DeliverableReview,
    collab_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_business
    ),
):
    """
    Approve all submitted deliverables
    for a collaboration.
    """

    if data.status != "approved":

        raise HTTPException(
            status_code=400,
            detail=(
                "This endpoint only supports "
                "approving all submitted "
                "deliverables."
            ),
        )

    application = _get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    deliverables = (
        db.query(Deliverable)
        .filter(
            Deliverable.application_id
            == application.id
        )
        .all()
    )

    submitted = [
        deliverable
        for deliverable in deliverables
        if deliverable.status == "submitted"
    ]

    if not submitted:

        raise HTTPException(
            status_code=400,
            detail=(
                "There are no submitted "
                "deliverables to approve."
            ),
        )

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    for deliverable in submitted:

        if (
            not deliverable.file_url
            or deliverable.media_type
            not in (
                "image",
                "video",
            )
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{deliverable.title} "
                    "has no valid submission "
                    "to review."
                ),
            )

    # --------------------------------------------------------
    # Approve
    # --------------------------------------------------------

    for deliverable in submitted:

        deliverable.status = "approved"

        deliverable.feedback = None

        create_notification(
            db,
            user_id=application.creator_id,
            type="deliverable_approved",
            title="Deliverable approved",
            message=(
                f"{deliverable.title} "
                "was approved by the brand."
            ),
            link=(
                "/workspace/active?"
                f"collab={application.id}"
            ),
            event_key=(
                f"deliverable-approved:"
                f"{deliverable.id}"
            ),
        )

    # Final approval of the collaboration releases the secured payment.
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    payout = _release_creator_payout_after_approval(db, application, campaign)

    db.commit()

    for deliverable in deliverables:
        db.refresh(deliverable)

    return [
        _deliverable_to_response(
            db,
            deliverable,
        )
        for deliverable in deliverables
    ]