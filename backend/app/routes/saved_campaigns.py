from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Campaign, SavedCampaign
from app.schemas.saved_campaign import SavedCampaignCreate, SavedCampaignResponse
from app.dependencies.auth import get_current_creator

router = APIRouter(prefix="/api/saved-campaigns", tags=["Saved Campaigns"])


@router.post("/", response_model=SavedCampaignResponse)
async def save_campaign(
    data: SavedCampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator)
):
    campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    existing = db.query(SavedCampaign).filter(
        SavedCampaign.creator_id == current_user.id,
        SavedCampaign.campaign_id == data.campaign_id
    ).first()
    if existing:
        # Idempotent rather than a 400 — the frontend just wants "this
        # is saved" to be true afterwards, whether or not it already was.
        return existing

    saved = SavedCampaign(creator_id=current_user.id, campaign_id=data.campaign_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.get("/", response_model=list[SavedCampaignResponse])
async def get_saved_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator)
):
    return (
        db.query(SavedCampaign)
        .filter(SavedCampaign.creator_id == current_user.id)
        .order_by(SavedCampaign.created_at.desc())
        .all()
    )


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator)
):
    saved = db.query(SavedCampaign).filter(
        SavedCampaign.creator_id == current_user.id,
        SavedCampaign.campaign_id == campaign_id
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="This campaign isn't saved")

    db.delete(saved)
    db.commit()
    return None