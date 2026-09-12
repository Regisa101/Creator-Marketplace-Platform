from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Payment, Rating, Campaign, Application
from app.schemas.rating import (
    RatingCreate,
    RatingResponse,
    CreatorRatingSummary,
)
from app.dependencies.auth import get_current_user, get_current_business


router = APIRouter(
    prefix="/api/ratings",
    tags=["Ratings"],
)


# ============================================================
# AUTHORIZATION
# ============================================================

def _get_authorized_collab(
    db: Session,
    current_user: User,
    collab_id: int,
) -> Application:
    """
    Return the collaboration only if the current user belongs
    to that collaboration.

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

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == application.campaign_id)
        .first()
    )

    if not campaign:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    creator_access = application.creator_id == current_user.id
    business_access = campaign.business_id == current_user.id

    if not (creator_access or business_access):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this collaboration",
        )

    return application


# ============================================================
# RESPONSE HELPER
# ============================================================

def _rating_to_response(
    db: Session,
    rating: Rating,
) -> RatingResponse:

    business = (
        db.query(User)
        .filter(User.id == rating.business_id)
        .first()
    )

    application = (
        db.query(Application)
        .filter(Application.id == rating.application_id)
        .first()
    )

    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == application.campaign_id)
        .first()
        if application
        else None
    )

    return RatingResponse(
        id=rating.id,
        application_id=rating.application_id,
        business_id=rating.business_id,
        creator_id=rating.creator_id,
        business_name=(
            (business.profile or {}).get("company_name")
            if business
            else None
        ),
        campaign_title=(
            campaign.title
            if campaign
            else None
        ),
        score=rating.score,
        review=rating.review,
        created_at=rating.created_at,
    )


# ============================================================
# CREATE RATING
# ============================================================

@router.post(
    "/",
    response_model=RatingResponse,
)
async def create_rating(
    data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """
    A business can rate a creator after the collaboration
    payment has been completed.

    Each collaboration can only be rated once.
    """

    application = _get_authorized_collab(
        db,
        current_user,
        data.collab_id,
    )

    paid = (
    db.query(Payment)
    .filter(
        Payment.application_id == application.id,
        Payment.payment_type == "creator_payout",
        Payment.status.in_(["released", "completed"]),
    )
    .first()
)

    if not paid:
        raise HTTPException(
            status_code=400,
            detail=(
                "You can rate a creator once payment for "
                "this collaboration is completed."
            ),
        )

    existing = (
        db.query(Rating)
        .filter(
            Rating.application_id == application.id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You've already rated this collaboration.",
        )

    rating = Rating(
        application_id=application.id,
        business_id=current_user.id,
        creator_id=application.creator_id,
        score=data.score,
        review=data.review,
    )

    db.add(rating)
    db.commit()
    db.refresh(rating)

    return _rating_to_response(
        db,
        rating,
    )


# ============================================================
# GET RATING FOR COLLABORATION
# ============================================================

@router.get(
    "/by-collab/{collab_id}",
    response_model=Optional[RatingResponse],
)
async def get_rating_for_collab(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_authorized_collab(
        db,
        current_user,
        collab_id,
    )

    rating = (
        db.query(Rating)
        .filter(
            Rating.application_id == collab_id
        )
        .first()
    )

    if not rating:
        return None

    return _rating_to_response(
        db,
        rating,
    )


# ============================================================
# CREATOR RATINGS
# ============================================================

@router.get(
    "/creator/{creator_id}",
    response_model=CreatorRatingSummary,
)
async def get_creator_ratings(
    creator_id: int,
    db: Session = Depends(get_db),
):
    """
    Public endpoint.

    Used by creator profiles and discovery cards.
    """

    ratings = (
        db.query(Rating)
        .filter(
            Rating.creator_id == creator_id
        )
        .order_by(
            Rating.created_at.desc()
        )
        .all()
    )

    avg = (
        db.query(func.avg(Rating.score))
        .filter(
            Rating.creator_id == creator_id
        )
        .scalar()
    )

    return CreatorRatingSummary(
        average=(
            round(float(avg), 2)
            if avg is not None
            else None
        ),
        count=len(ratings),
        ratings=[
            _rating_to_response(db, rating)
            for rating in ratings
        ],
    )