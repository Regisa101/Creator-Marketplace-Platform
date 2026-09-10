from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Application, Campaign, Deliverable, PublicationProof, CalendarEvent, Payment, GiftFulfillment
from app.schemas.publication import PublicationProofCreate, PublicationProofReview, PublicationProofResponse
from app.dependencies.auth import get_current_user, get_current_creator, get_current_business
from app.services.notifications import create_notification
from app.routes.workspace import _get_authorized_collab, _maybe_complete_campaign
router=APIRouter(prefix="/api/publication",tags=["Publication Proof"])
def campaign(db,app): return db.query(Campaign).filter(Campaign.id==app.campaign_id).first()
def maybe_complete(db,app):
 c=campaign(db,app); ds=db.query(Deliverable).filter(Deliverable.application_id==app.id).all()
 if ds and not all(d.status=="approved" for d in ds): return False
 if getattr(c,"completion_mode","approval_only")=="publication_required":
  ps=db.query(PublicationProof).filter(PublicationProof.application_id==app.id).all()
  if not ps or not all(p.status=="verified" for p in ps): return False
 if getattr(c.campaign_type,"value",str(c.campaign_type))=="paid":
  payment=db.query(Payment).filter(Payment.application_id==app.id,Payment.status.in_(["funded","released","completed"])).order_by(Payment.created_at.desc()).first()
  if not payment: return False
  if payment.status == "funded":
   payment.status="released"
   create_notification(db,user_id=app.creator_id,type="payment_released",title="Payment released",message=f"Rs. {float(payment.amount):,.2f} has been automatically released for {c.title} because all campaign requirements were verified.",link="/workspace/history",event_key=f"auto-payment-released:{payment.id}")
   create_notification(db,user_id=c.business_id,type="campaign_completed",title="Campaign completed",message=f"{c.title} is complete. Publication was verified and the agreed payment was released.",link="/analytics",event_key=f"auto-campaign-completed:{app.id}")
 if getattr(c.campaign_type,"value",str(c.campaign_type))=="gifted":
  f=db.query(GiftFulfillment).filter(GiftFulfillment.application_id==app.id).first()
  if f and f.status!="received": return False
 app.status="completed"; _maybe_complete_campaign(db,c); return True
@router.get("/{collab_id}",response_model=list[PublicationProofResponse])
async def get_proofs(collab_id:int,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
 _get_authorized_collab(db,current_user,collab_id); return db.query(PublicationProof).filter(PublicationProof.application_id==collab_id).order_by(PublicationProof.submitted_at.desc()).all()
@router.post("/{collab_id}",response_model=PublicationProofResponse)
async def submit_proof(collab_id:int,data:PublicationProofCreate,db:Session=Depends(get_db),current_user:User=Depends(get_current_creator)):
 app=_get_authorized_collab(db,current_user,collab_id); c=campaign(db,app)
 if getattr(c,"completion_mode","approval_only")!="publication_required": raise HTTPException(400,"This campaign does not require publication proof.")
 ds=db.query(Deliverable).filter(Deliverable.application_id==app.id).all()
 if ds and not all(d.status=="approved" for d in ds): raise HTTPException(400,"All content must be approved before publication proof can be submitted.")
 if not data.post_url.startswith(("http://","https://")): raise HTTPException(400,"Enter a valid public post URL.")
 p=PublicationProof(application_id=app.id,deliverable_id=data.deliverable_id,platform=data.platform.lower().strip(),post_type=data.post_type,post_url=data.post_url.strip(),screenshot_url=data.screenshot_url,status="pending")
 db.add(p); db.flush()
 verify_due=datetime.now(timezone.utc)+timedelta(hours=24)
 db.add(CalendarEvent(application_id=app.id,created_by=current_user.id,title="Verify publication proof",description=f"Verify the creator's {p.platform} publication for {c.title}.",event_date=verify_due,event_type="deadline"))
 create_notification(db,user_id=c.business_id,type="publication_proof_submitted",title="Publication proof submitted",message=f"Publication proof for {c.title} is ready for verification.",link=f"/workspace/deliverables?collab={app.id}",event_key=f"publication-proof:{p.id}")
 db.commit(); db.refresh(p); return p
@router.post("/{collab_id}/{proof_id}/review",response_model=PublicationProofResponse)
async def review_proof(collab_id:int,proof_id:int,data:PublicationProofReview,db:Session=Depends(get_db),current_user:User=Depends(get_current_business)):
 app=_get_authorized_collab(db,current_user,collab_id); p=db.query(PublicationProof).filter(PublicationProof.id==proof_id,PublicationProof.application_id==app.id).first()
 if not p: raise HTTPException(404,"Publication proof not found")
 if data.status not in ("verified","correction_requested","rejected"): raise HTTPException(400,"Invalid proof review status")
 p.status=data.status; p.feedback=data.feedback; p.verified_by=current_user.id
 if data.status=="verified": p.verified_at=datetime.now(timezone.utc)
 c=campaign(db,app)
 create_notification(db,user_id=app.creator_id,type="publication_verified" if data.status=="verified" else "publication_correction",title="Publication verified" if data.status=="verified" else "Publication proof needs attention",message=(f"Your publication for {c.title} was verified." if data.status=="verified" else (data.feedback or "Please correct your publication proof.")),link=f"/workspace/deliverables?collab={app.id}",event_key=f"publication:{p.id}:{p.status}")
 if data.status=="verified": maybe_complete(db,app)
 db.commit(); db.refresh(p); return p
