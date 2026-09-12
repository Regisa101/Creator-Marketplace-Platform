from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models import (
    User,
    Campaign,
    Application,
    Deliverable,
)
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)
from app.dependencies.auth import get_current_user, get_current_creator
from app.services.notifications import create_notification


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"]
)


MATCH_WEIGHTS = {
    "category": 20,
    "content_type": 20,
    "creator_size": 15,
    "location": 10,
    "language": 10,
    "followers": 10,
    "experience": 15,
}


def _norm(value):
    return str(value or "").strip().lower()


def _creator_follower_count(profile):
    socials = getattr(profile, "socials", None) or []
    return max(
        [int(getattr(s, "follower_count", 0) or 0) for s in socials] or [0]
    )


def _creator_size(followers):
    if followers < 10000:
        return "Nano"
    if followers < 50000:
        return "Micro"
    if followers < 100000:
        return "Mid-tier"
    return "Macro"


def _range_match(followers, requested):
    r = _norm(requested).replace("–", "-")

    if r == "1k-10k":
        return 1000 <= followers <= 10000

    if r == "10k-50k":
        return 10000 <= followers <= 50000

    if r == "50k-100k":
        return 50000 <= followers <= 100000

    if r == "100k+":
        return followers >= 100000

    return False


def _location_match(creator_location, requested):
    c = _norm(creator_location)
    r = _norm(requested)

    if not r or r == "any location":
        return True

    if r == "nepal":
        return (
            "nepal" in c
            or c in {
                "kathmandu",
                "lalitpur",
                "bhaktapur",
                "pokhara",
            }
        )

    if r == "kathmandu valley":
        return any(
            x in c
            for x in (
                "kathmandu",
                "lalitpur",
                "patan",
                "bhaktapur",
            )
        )

    return r in c


def _matches_any(values, requested):
    values = {_norm(v) for v in (values or [])}
    return any(
        _norm(r) in values
        for r in (requested or [])
    )


def _score_application(campaign, profile, db):
    req = campaign.creator_requirements or {}

    followers = _creator_follower_count(profile)
    creator_size = _creator_size(followers)

    completed = db.query(Application).filter(
        Application.creator_id == profile.user_id,
        Application.status == "completed",
    ).count()

    checks = []

    def add(key, label, matched, detail):
        max_score = MATCH_WEIGHTS[key]

        checks.append({
            "key": key,
            "label": label,
            "score": max_score if matched else 0,
            "max": max_score,
            "matched": bool(matched),
            "detail": detail,
        })

    # Category
    categories = req.get("categories") or []
    cat_values = list(profile.categories or [])

    cat_aliases = {
        "ugc": "ugc creator",
        "video creator": "videographer",
        "photographer": "photographer",
    }

    cat_match = (
        _matches_any(cat_values, categories)
        or any(
            _norm(r) == _norm(profile.creator_type)
            or _norm(profile.creator_type)
            == cat_aliases.get(_norm(r), "__none__")
            for r in categories
        )
    )

    add(
        "category",
        "Category",
        cat_match,
        ", ".join(categories) if categories else "Any",
    )

    # Content type
    content_req = req.get("content_types") or []

    content_match = (
        _matches_any(profile.content_types or [], content_req)
        if content_req
        else True
    )

    add(
        "content_type",
        "Content type",
        content_match,
        ", ".join(content_req) if content_req else "Any",
    )

    # Creator size
    size_req = req.get("creator_sizes") or []

    size_match = (
        creator_size in size_req
        if size_req
        else True
    )

    add(
        "creator_size",
        "Creator size",
        size_match,
        creator_size,
    )

    # Location
    locations = req.get("locations") or []

    loc_match = (
        any(
            _location_match(profile.location, r)
            for r in locations
        )
        if locations
        else True
    )

    add(
        "location",
        "Location",
        loc_match,
        profile.location or "Not specified",
    )

    # Language
    langs = req.get("languages") or []

    lang_match = (
        _matches_any(profile.languages or [], langs)
        if langs
        else True
    )

    add(
        "language",
        "Language",
        lang_match,
        ", ".join(profile.languages or []) or "Not specified",
    )

    # Followers
    follower_ranges = req.get("follower_ranges") or []

    follower_match = (
        any(
            _range_match(followers, r)
            for r in follower_ranges
        )
        if follower_ranges
        else True
    )

    add(
        "followers",
        "Followers",
        follower_match,
        f"{followers:,}",
    )

    # Experience
    exp_score = min(
        15,
        6 + completed * 3
    )

    checks.append({
        "key": "experience",
        "label": "Experience",
        "score": exp_score,
        "max": 15,
        "matched": exp_score >= 12,
        "detail": (
            f"{completed} completed collaboration"
            f"{'' if completed == 1 else 's'}"
        ),
    })

    total = sum(
        c["score"]
        for c in checks
    )

    configured = sum(
        1
        for key in (
            "categories",
            "content_types",
            "creator_sizes",
            "locations",
            "languages",
            "follower_ranges",
        )
        if req.get(key)
    )

    reasons = []

    key_map = {
        "category": "categories",
        "content_type": "content_types",
        "creator_size": "creator_sizes",
        "location": "locations",
        "language": "languages",
        "followers": "follower_ranges",
    }

    for c in checks:
        if (
            c["key"] == "experience"
            or not req.get(
                key_map.get(c["key"], "")
            )
        ):
            continue

        reasons.append(
            f"{c['label']} ✓"
            if c["matched"]
            else f"{c['label']} does not match"
        )

    return (
        round(total),
        checks,
        reasons,
        configured + 1,
    )


# ============================================================
# CREATE APPLICATION
# ============================================================

@router.post(
    "/",
    response_model=ApplicationResponse
)
async def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    # Check campaign
    campaign = db.query(Campaign).filter(
        Campaign.id == data.campaign_id
    ).first()

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    if campaign.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Campaign is not accepting applications",
        )

    campaign_type = getattr(campaign.campaign_type, "value", str(campaign.campaign_type))
    if campaign_type == "paid" and getattr(campaign, "funding_status", "unfunded") != "funded":
        raise HTTPException(status_code=400, detail="This paid campaign is not funded yet and is not accepting applications.")

    # Check deadline
    deadline = (
        campaign.application_deadline
        or campaign.deadline
    )

    if deadline:
        if deadline.tzinfo is None:
            deadline = deadline.replace(
                tzinfo=timezone.utc
            )

        if datetime.now(timezone.utc) > deadline:
            raise HTTPException(
                status_code=400,
                detail="The application deadline has passed.",
            )

    # Check creator limit
    accepted_count = db.query(Application).filter(
        Application.campaign_id == campaign.id,
        Application.status.in_(
            ["accepted", "completed"]
        ),
    ).count()

    if accepted_count >= (
        campaign.creators_needed or 1
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "This campaign has already selected "
                "all required creators."
            ),
        )

    # ========================================================
    # CHECK EXISTING APPLICATION
    #
    # IMPORTANT:
    # Withdrawn applications are allowed to apply again.
    # ========================================================

    existing = db.query(Application).filter(
        Application.campaign_id == data.campaign_id,
        Application.creator_id == current_user.id,
        Application.status != "withdrawn",
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already applied to this campaign",
        )

    # Create application
    # Paid campaigns use the campaign budget as the fixed compensation.
    # There is no creator-side counter-offer or post-selection negotiation.
    fixed_rate = (
        round(float(campaign.budget) / max(int(campaign.creators_needed or 1), 1), 2)
        if getattr(campaign.campaign_type, "value", str(campaign.campaign_type)) == "paid"
        and campaign.budget is not None
        else data.rate
    )

    application = Application(
        campaign_id=data.campaign_id,
        creator_id=current_user.id,
        proposal=data.proposal,
        rate=fixed_rate,
        agreed_rate=fixed_rate if fixed_rate is not None else None,
        rate_locked=1 if fixed_rate is not None else 0,
        message=data.message,
        application_answers=data.application_answers,
        selected_portfolio=data.selected_portfolio,
    )

    db.add(application)
    db.flush()

    db.commit()
    db.refresh(application)

    # Notify business
    create_notification(
        db,
        user_id=campaign.business_id,
        type="application_received",
        title="New application received",
        message=(
            f"A creator applied to {campaign.title}."
        ),
        link=(
            f"/applications?campaign={campaign.id}"
        ),
        reference_id=application.id,
        event_key=(
            f"application-received:{application.id}"
        ),
    )

    db.commit()

    return application


# ============================================================
# GET APPLICATIONS
# ============================================================

@router.get(
    "/",
    response_model=list[ApplicationResponse]
)
async def get_applications(
    campaign_id: Optional[int] = Query(
        None,
        description="Filter by campaign ID",
    ),
    status: Optional[str] = Query(
        None,
        description="Filter by status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get applications based on user role."""

    query = db.query(Application)

    if current_user.role == "creator":
        query = query.filter(
            Application.creator_id == current_user.id
        )

    elif current_user.role == "business":
        campaign_ids = (
            db.query(Campaign.id)
            .filter(
                Campaign.business_id
                == current_user.id
            )
            .subquery()
        )

        query = query.filter(
            Application.campaign_id.in_(
                campaign_ids
            )
        )

    if campaign_id is not None:
        query = query.filter(
            Application.campaign_id == campaign_id
        )

    if status:
        query = query.filter(
            Application.status == status
        )

    applications = query.order_by(
        Application.created_at.desc()
    ).all()

    result = []

    for app in applications:
        campaign = db.query(Campaign).filter(
            Campaign.id == app.campaign_id
        ).first()

        item = (
            ApplicationResponse
            .model_validate(app)
            .model_dump()
        )

        item["completed_collaborations"] = (
            db.query(Application)
            .filter(
                Application.creator_id
                == app.creator_id,
                Application.status
                == "completed",
            )
            .count()
        )

        item["creators_needed"] = (
            campaign.creators_needed or 1
        )

        item["campaign_budget"] = (
            float(campaign.budget)
            if campaign.budget is not None
            else None
        )

        item["campaign_type"] = getattr(
            campaign.campaign_type,
            "value",
            str(campaign.campaign_type),
        )

        profile = (
            app.creator.creator_profile
            if app.creator
            else None
        )

        if (
            current_user.role == "business"
            and profile
        ):
            (
                score,
                breakdown,
                reasons,
                configured_count,
            ) = _score_application(
                campaign,
                profile,
                db,
            )

            item["match_score"] = score
            item["match_breakdown"] = breakdown
            item["match_reasons"] = reasons
            item["match_configured_count"] = (
                configured_count
            )

        result.append(item)

    return result


# ============================================================
# UPDATE APPLICATION STATUS
# ============================================================

@router.put(
    "/{application_id}",
    response_model=ApplicationResponse,
)
async def update_application_status(
    application_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update application status (Accept/Reject) - Business only."""

    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    # Check campaign ownership
    campaign = db.query(Campaign).filter(
        Campaign.id == application.campaign_id
    ).first()

    if campaign.business_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    # Update collaboration deadline
    if data.deliverable_deadline is not None:

        if application.status not in (
            "accepted",
            "completed",
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Set a collaboration deadline "
                    "after accepting the creator."
                ),
            )

        d = data.deliverable_deadline

        if d.tzinfo is None:
            d = d.replace(
                tzinfo=timezone.utc
            )

        if d <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Deliverable deadline must "
                    "be in the future."
                ),
            )

        application.deliverable_deadline = (
            data.deliverable_deadline
        )

        deliverables = db.query(
            Deliverable
        ).filter(
            Deliverable.application_id
            == application.id
        ).all()

        for deliverable in deliverables:
            if deliverable.status in (
                "pending",
                "revision_requested",
            ):
                deliverable.due_date = (
                    data.deliverable_deadline
                )

        db.commit()

        create_notification(
            db,
            user_id=application.creator_id,
            type="deadline_updated",
            title=(
                "Your collaboration deadline "
                "was updated"
            ),
            message=(
                f"Your deliverables for "
                f"{campaign.title} are due "
                f"{data.deliverable_deadline.strftime('%b %d, %Y')}."
            ),
            link=(
                f"/workspace/deliverables"
                f"?collab={application.id}"
            ),
            reference_id=application.id,
            event_key=(
                f"deadline-updated:"
                f"{application.id}:"
                f"{data.deliverable_deadline.isoformat()}"
            ),
        )

        db.commit()
        db.refresh(application)

        return application

    # Only pending applications can be accepted/rejected
    if application.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Application is no longer pending",
        )

    if data.status not in (
        "accepted",
        "rejected",
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be accepted or rejected"
            ),
        )

    # ========================================================
    # ACCEPT
    # ========================================================

    if data.status == "accepted":

        if getattr(
            campaign.campaign_type,
            "value",
            str(campaign.campaign_type),
        ) == "paid":

            if getattr(campaign, "funding_status", "unfunded") != "funded":
                raise HTTPException(
                    status_code=400,
                    detail="Fund the campaign budget before accepting a creator.",
                )

            # Compensation is fixed by the campaign budget.
            if not application.agreed_rate:
                if campaign.budget is None or float(campaign.budget) <= 0:
                    raise HTTPException(status_code=400, detail="This paid campaign does not have a valid fixed budget.")
                fixed_rate = round(float(campaign.budget) / max(int(campaign.creators_needed or 1), 1), 2)
                application.agreed_rate = fixed_rate
                application.rate = fixed_rate
                application.rate_locked = 1

        now = datetime.now(timezone.utc)

        deadline = (
            campaign.application_deadline
            or campaign.deadline
        )

        if deadline and deadline.tzinfo is None:
            deadline = deadline.replace(
                tzinfo=timezone.utc
            )

        if deadline and now > deadline:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The application deadline "
                    "has passed."
                ),
            )

        accepted_count = db.query(
            Application
        ).filter(
            Application.campaign_id
            == campaign.id,
            Application.status.in_(
                ["accepted", "completed"]
            ),
        ).count()

        if accepted_count >= (
            campaign.creators_needed or 1
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "The campaign has reached "
                    "its creator limit."
                ),
            )

    # Update application status
    application.status = data.status

    db.commit()
    db.refresh(application)

    # ========================================================
    # ACCEPTED
    # ========================================================

    if data.status == "accepted":

        campaign.status = "in_progress"

        # Create deliverables
        if campaign.deliverables:

            existing = db.query(
                Deliverable
            ).filter(
                Deliverable.application_id
                == application.id
            ).count()

            if existing == 0:

                for item in campaign.deliverables:

                    db.add(
                        Deliverable(
                            application_id=application.id,
                            title=str(item),
                            due_date=(
                                application.deliverable_deadline
                                or campaign.deliverable_deadline
                            ),
                            status="pending",
                        )
                    )

        db.commit()

        create_notification(
            db,
            user_id=application.creator_id,
            type="application_accepted",
            title="You've been accepted!",
            message=(
                f"{campaign.brand_name or 'The brand'} "
                f"selected you for {campaign.title}."
            ),
            link="/workspace/active",
            reference_id=application.id,
            event_key=(
                f"application-accepted:"
                f"{application.id}"
            ),
        )

        db.commit()

    # ========================================================
    # REJECTED
    # ========================================================

    else:

        create_notification(
            db,
            user_id=application.creator_id,
            type="application_rejected",
            title="Application update",
            message=(
                f"Your application to "
                f"{campaign.title} was not selected "
                "this time."
            ),
            link="/applications",
            reference_id=application.id,
            event_key=(
                f"application-rejected:"
                f"{application.id}"
            ),
        )

        db.commit()

    return application


# ============================================================
# WITHDRAW APPLICATION
# ============================================================

@router.delete("/{application_id}")
async def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator),
):
    """
    Creator withdraws their application.

    Pending:
        Mark the application as withdrawn instead of deleting it.

    Accepted:
        Mark the application as withdrawn and, if this was the
        campaign's last active creator, return the campaign to
        published.

    Rejected/withdrawn:
        Cannot be withdrawn again.
    """

    # Find application
    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    # Make sure this creator owns the application
    if application.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not your application",
        )

    # ========================================================
    # PENDING APPLICATION
    # ========================================================
    #
    # DO NOT use:
    #
    #     db.delete(application)
    #
    #
    # Instead, preserve the application and change its status.
    # ========================================================

    if application.status == "pending":

        campaign = db.query(Campaign).filter(
            Campaign.id == application.campaign_id
        ).first()

        application.status = "withdrawn"

        db.commit()

        # Notify business
        if campaign:

            create_notification(
                db,
                user_id=campaign.business_id,
                type="application_withdrawn",
                title="Application withdrawn",
                message=(
                    "A creator withdrew their "
                    f"application to {campaign.title}."
                ),
                link=(
                    f"/applications"
                    f"?campaign={campaign.id}"
                ),
                reference_id=application.id,
                event_key=(
                    f"application-withdrawn:"
                    f"{application.id}"
                ),
            )

            db.commit()

        return {
            "message": (
                "Application withdrawn successfully"
            )
        }

    # ========================================================
    # ACCEPTED APPLICATION
    # ========================================================

    if application.status == "accepted":

        application.status = "withdrawn"

        db.commit()

        campaign = db.query(Campaign).filter(
            Campaign.id == application.campaign_id
        ).first()

        # If this was the last accepted creator,
        # allow the campaign to accept another creator.
        if (
            campaign
            and campaign.status == "in_progress"
        ):

            still_active = db.query(
                Application
            ).filter(
                Application.campaign_id
                == campaign.id,
                Application.status
                == "accepted",
            ).count()

            if still_active == 0:

                campaign.status = "published"

                db.commit()

        return {
            "message": (
                "You've left this collaboration. "
                "The brand has been notified."
            )
        }

    # ========================================================
    # REJECTED / ALREADY WITHDRAWN
    # ========================================================

    raise HTTPException(
        status_code=400,
        detail=(
            "This application is already rejected "
            "or withdrawn — there's nothing active "
            "to withdraw from"
        ),
    )