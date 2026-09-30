from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Payment(Base):
    """CreatorHub payment ledger.

    Current marketplace payments are platform_fee rows: the business pays
    CreatorHub's 10% service fee through Khalti. Creator compensation is
    stored on the contract but is settled directly between the business and
    creator, outside CreatorHub. Older selection_fee/collaboration rows are
    retained for backwards compatibility.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    # Nullable because campaign funding happens before an application exists.
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)
    # platform_fee = CreatorHub service-fee payment (current flow)
    # selection_fee / collaboration = legacy payment types
    payment_type = Column(String(30), nullable=False, default="collaboration")

    # Our own reference, sent to Khalti as purchase_order_id and used to
    # find the row again on the return redirect / lookup.
    purchase_order_id = Column(String(100), unique=True, nullable=False, index=True)

    # Khalti's identifiers for the transaction.
    pidx = Column(String(100), unique=True, nullable=True, index=True)
    transaction_id = Column(String(100), nullable=True)

    amount = Column(DECIMAL(10, 2), nullable=False)  # NPR
    platform_fee = Column(DECIMAL(10, 2), nullable=True)
    creator_payout = Column(DECIMAL(10, 2), nullable=True)
    currency = Column(String(10), default="NPR")

    # initiated -> completed | failed | expired
    status = Column(String(20), default="initiated")
    method = Column(String(20), default="khalti")

    # Checkout metadata. Never store passwords, PINs or OTPs.
    payment_details = Column(JSON, nullable=True)

    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application")
    campaign = relationship("Campaign")
