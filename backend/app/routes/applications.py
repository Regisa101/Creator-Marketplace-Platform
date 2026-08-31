from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, Campaign, Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.dependencies.auth import get_current_user, get_current_creator

router = APIRouter(prefix="/api/applications", tags=["Applications"])

@router.post("/", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_creator)
):
    # Check campaign exists and is published
    campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "published":
        raise HTTPException(status_code=400, detail="Campaign is not accepting applications")
    
    # Check if already applied
    existing = db.query(Application).filter(
        Application.campaign_id == data.campaign_id,
        Application.creator_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this campaign")
    
    # Create application
    application = Application(
        campaign_id=data.campaign_id,
        creator_id=current_user.id,
        proposal=data.proposal,
        rate=data.rate,
        message=data.message
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/", response_model=list[ApplicationResponse])
async def get_applications(
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get applications based on user role"""
    query = db.query(Application)
    
    if current_user.role == "creator":
        query = query.filter(Application.creator_id == current_user.id)
    elif current_user.role == "business":
        # Get campaigns owned by business
        campaign_ids = db.query(Campaign.id).filter(Campaign.business_id == current_user.id).subquery()
        query = query.filter(Application.campaign_id.in_(campaign_ids))
    
    if campaign_id is not None:
        query = query.filter(Application.campaign_id == campaign_id)
    if status:
        query = query.filter(Application.status == status)
    
    applications = query.order_by(Application.created_at.desc()).all()
    return applications


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update application status (Accept/Reject) - Business only"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check permission - user must own the campaign
    campaign = db.query(Campaign).filter(Campaign.id == application.campaign_id).first()
    if campaign.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Application is no longer pending")
    
    application.status = data.status
    db.commit()
    db.refresh(application)
    
    # If accepted, update campaign status
    if data.status == "accepted":
        campaign.status = "in_progress"
        db.commit()
    
    return application