from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Application,
    Campaign,
    Deliverable,
    PublicationProof,
    Payment,
)
from app.schemas.publication import (
    PublicationProofCreate,
    PublicationProofReview,
    PublicationProofResponse,
)
from app.dependencies.auth import (
    get_current_user,
    get_current_creator,
    get_current_business,
)
from app.services.notifications import create_notification


router = APIRouter(
    prefix="/api/publication",
    tags=["Publication Proof"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_campaign(db: Session, application: Application):
    return (
        db.query(Campaign)
        .filter(Campaign.id == application.campaign_id)
        .first()
    )


def get_authorized_collab(
    db: Session,
    current_user: User,
    collab_id: int,
) -> Application:
    """
    Get an application/collaboration only if the current user is allowed
    to access it.

    Creator:
        application.creator_id == current_user.id

    Business:
        campaign.business_id == current_user.id
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

    campaign = get_campaign(db, application)

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    is_creator = application.creator_id == current_user.id
    is_business = campaign.business_id == current_user.id

    if not (is_creator or is_business):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this collaboration",
        )

    return application


def maybe_complete_campaign(
    db: Session,
    application: Application,
) -> bool:
    """
    Complete the application when all required deliverables and,
    when applicable, publication proofs are verified.

    For paid campaigns, release funded payment automatically.
    """

    campaign = get_campaign(db, application)

    if not campaign:
        return False

    # ---------------------------------------------------------
    # 1. All deliverables must be approved
    # ---------------------------------------------------------

    deliverables = (
        db.query(Deliverable)
        .filter(Deliverable.application_id == application.id)
        .all()
    )

    if deliverables and not all(
        deliverable.status == "approved"
        for deliverable in deliverables
    ):
        return False

    # ---------------------------------------------------------
    # 2. Publication proof required?
    # ---------------------------------------------------------

    completion_mode = getattr(
        campaign,
        "completion_mode",
        "approval_only",
    )

    if completion_mode == "publication_required":

        proofs = (
            db.query(PublicationProof)
            .filter(
                PublicationProof.application_id == application.id
            )
            .all()
        )

        if not proofs:
            return False

        if not all(
            proof.status == "verified"
            for proof in proofs
        ):
            return False

    # ---------------------------------------------------------
    # 3. Paid campaign payment
    # ---------------------------------------------------------

    campaign_type = getattr(
        campaign.campaign_type,
        "value",
        str(campaign.campaign_type),
    )

    if campaign_type == "paid":

        payment = (
            db.query(Payment)
            .filter(
                Payment.application_id == application.id,
                Payment.status.in_(
                    [
                        "funded",
                        "released",
                        "completed",
                    ]
                ),
            )
            .order_by(Payment.created_at.desc())
            .first()
        )

        if not payment:
            return False

        if payment.status == "funded":

            payment.status = "released"

            create_notification(
                db,
                user_id=application.creator_id,
                type="payment_released",
                title="Payment released",
                message=(
                    f"Rs. {float(payment.amount):,.2f} has been "
                    f"automatically released for {campaign.title} "
                    "because all campaign requirements were verified."
                ),
                link="/workspace/history",
                event_key=f"auto-payment-released:{payment.id}",
            )

            create_notification(
                db,
                user_id=campaign.business_id,
                type="campaign_completed",
                title="Campaign completed",
                message=(
                    f"{campaign.title} is complete. Publication was "
                    "verified and the agreed payment was released."
                ),
                link="/analytics",
                event_key=f"auto-campaign-completed:{application.id}",
            )

    # ---------------------------------------------------------
    # 4. Complete the collaboration
    # ---------------------------------------------------------

    application.status = "completed"

    return True


# ---------------------------------------------------------------------------
# Get publication proofs
# ---------------------------------------------------------------------------

@router.get(
    "/{collab_id}",
    response_model=list[PublicationProofResponse],
)
async def get_proofs(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    return (
        db.query(PublicationProof)
        .filter(
            PublicationProof.application_id == application.id
        )
        .order_by(
            PublicationProof.submitted_at.desc()
        )
        .all()
    )


# ---------------------------------------------------------------------------
# Submit publication proof
# ---------------------------------------------------------------------------

@router.post(
    "/{collab_id}",
    response_model=PublicationProofResponse,
)
async def submit_proof(
    collab_id: int,
    data: PublicationProofCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    application = get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    campaign = get_campaign(
        db,
        application,
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    # Publication proof must actually be required
    if getattr(
        campaign,
        "completion_mode",
        "approval_only",
    ) != "publication_required":
        raise HTTPException(
            status_code=400,
            detail="This campaign does not require publication proof.",
        )

    # All content must be approved before publication
    deliverables = (
        db.query(Deliverable)
        .filter(
            Deliverable.application_id == application.id
        )
        .all()
    )

    if deliverables and not all(
        deliverable.status == "approved"
        for deliverable in deliverables
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "All content must be approved before "
                "publication proof can be submitted."
            ),
        )

    # Validate post URL
    post_url = data.post_url.strip()

    if not post_url.startswith(
        (
            "http://",
            "https://",
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid public post URL.",
        )

    # Create proof
    proof = PublicationProof(
        application_id=application.id,
        deliverable_id=data.deliverable_id,
        platform=data.platform.lower().strip(),
        post_type=data.post_type,
        post_url=post_url,
        screenshot_url=data.screenshot_url,
        status="pending",
    )

    db.add(proof)
    db.flush()

    # Notify business
    create_notification(
        db,
        user_id=campaign.business_id,
        type="publication_proof_submitted",
        title="Publication proof submitted",
        message=(
            f"Publication proof for {campaign.title} "
            "is ready for verification."
        ),
        link=f"/workspace/deliverables?collab={application.id}",
        event_key=f"publication-proof:{proof.id}",
    )

    db.commit()
    db.refresh(proof)

    return proof


# ---------------------------------------------------------------------------
# Review publication proof
# ---------------------------------------------------------------------------

@router.post(
    "/{collab_id}/{proof_id}/review",
    response_model=PublicationProofResponse,
)
async def review_proof(
    collab_id: int,
    proof_id: int,
    data: PublicationProofReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    application = get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    proof = (
        db.query(PublicationProof)
        .filter(
            PublicationProof.id == proof_id,
            PublicationProof.application_id == application.id,
        )
        .first()
    )

    if not proof:
        raise HTTPException(
            status_code=404,
            detail="Publication proof not found",
        )

    allowed_statuses = (
        "verified",
        "correction_requested",
        "rejected",
    )

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid proof review status",
        )

    proof.status = data.status
    proof.feedback = data.feedback
    proof.verified_by = current_user.id

    if data.status == "verified":
        proof.verified_at = datetime.now(timezone.utc)

    campaign = get_campaign(
        db,
        application,
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    # Notify creator
    if data.status == "verified":
        notification_type = "publication_verified"
        notification_title = "Publication verified"
        notification_message = (
            f"Your publication for {campaign.title} was verified."
        )
    else:
        notification_type = "publication_correction"
        notification_title = "Publication proof needs attention"
        notification_message = (
            data.feedback
            or "Please correct your publication proof."
        )

    create_notification(
        db,
        user_id=application.creator_id,
        type=notification_type,
        title=notification_title,
        message=notification_message,
        link=f"/workspace/deliverables?collab={application.id}",
        event_key=f"publication:{proof.id}:{proof.status}",
    )

    # If verified, check whether entire collaboration is complete
    if data.status == "verified":
        maybe_complete_campaign(
            db,
            application,
        )

    db.commit()
    db.refresh(proof)

    return proof