from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Payment(Base):
    """
    A payment the business makes to a creator for an accepted Application
    (collaboration). One Application can have multiple Payment rows over
    time (e.g. a first attempt that expired, then a successful retry) —
    the latest "completed" one is what counts as paid.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)

    # Our own reference, sent to Khalti as purchase_order_id and used to
    # find the row again on the return redirect / lookup.
    purchase_order_id = Column(String(100), unique=True, nullable=False, index=True)

    # Khalti's identifiers for the transaction.
    pidx = Column(String(100), unique=True, nullable=True, index=True)
    transaction_id = Column(String(100), nullable=True)

    amount = Column(DECIMAL(10, 2), nullable=False)  # NPR
    currency = Column(String(10), default="NPR")

    # initiated -> completed | failed | expired
    status = Column(String(20), default="initiated")
    method = Column(String(20), default="khalti")

    # Demo checkout metadata (payer/account/reference). Never store passwords, PINs or OTPs.
    payment_details = Column(JSON, nullable=True)

    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application")
