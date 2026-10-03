from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_business
from app.models import User
from app.services.analytics import RANGE_DAYS, build_business_analytics

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/business")
def get_business_analytics(
    range_key: str = Query("30d", alias="range"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_business),
):
    """Analytics for the logged-in brand, calculated from the existing database.

    `range` is one of 7d, 30d, 90d, all.

    Plain `def` (not `async def`) on purpose: this runs several database
    queries, so FastAPI executes it in a worker thread instead of blocking
    the event loop.
    """
    if range_key not in RANGE_DAYS:
        raise HTTPException(status_code=400, detail="range must be one of: 7d, 30d, 90d, all")
    return build_business_analytics(db, current_user.id, range_key)