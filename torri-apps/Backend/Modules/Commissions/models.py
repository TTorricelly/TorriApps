from uuid import uuid4
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Date, DateTime, ForeignKey, Enum, Boolean,
    CheckConstraint, UniqueConstraint, Text, PrimaryKeyConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from Config.Database import Base
from .constants import CommissionPaymentStatus, CommissionPaymentMethod


class Commission(Base):
    """
    Represents a commission earned by a professional for a completed appointment.
    Automatically created when an appointment status changes to COMPLETED.
    """
    __tablename__ = "commissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    professional_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    
    # Financial data (captured at commission creation)
    service_price = Column(Numeric(10, 2), nullable=False)
    commission_percentage = Column(Numeric(5, 2), nullable=False)
    calculated_value = Column(Numeric(10, 2), nullable=False)
    adjusted_value = Column(Numeric(10, 2), nullable=True)
    adjustment_reason = Column(Text, nullable=True)
    
    # Payment tracking
    payment_status = Column(Enum(CommissionPaymentStatus), nullable=False, default=CommissionPaymentStatus.PENDING, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships - temporarily disabled to avoid circular imports
    # professional = relationship("Core.Auth.models.User", foreign_keys=[professional_id])
    # appointment = relationship("Modules.Appointments.models.Appointment", foreign_keys=[appointment_id])
    
    # Payment relationship
    payment_items = relationship("CommissionPaymentItem", back_populates="commission", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('appointment_id', name='uq_commission_appointment'),
        CheckConstraint('calculated_value >= 0', name='chk_commission_positive'),
        CheckConstraint('adjusted_value IS NULL OR adjusted_value >= 0', name='chk_adjusted_positive')
    )

    def __repr__(self):
        return f"<Commission(id={self.id}, professional_id='{self.professional_id}', calculated_value={self.calculated_value}, status='{self.payment_status.value}')>"


class CommissionPayment(Base):
    """
    Represents a batch payment of multiple commissions to a professional.
    Groups multiple commission payments together for administrative purposes.
    """
    __tablename__ = "commission_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    professional_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Payment details
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(CommissionPaymentMethod), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    # Documentation  
    receipt_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    # professional = relationship("Core.Auth.models.User", foreign_keys=[professional_id])
    payment_items = relationship("CommissionPaymentItem", back_populates="payment", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint('total_amount > 0', name='chk_payment_amount_positive'),
    )

    def __repr__(self):
        return f"<CommissionPayment(id={self.id}, professional_id='{self.professional_id}', total_amount={self.total_amount}, payment_date='{self.payment_date}')>"


class CommissionPaymentItem(Base):
    """
    Links individual commissions to batch payments.
    Many-to-many relationship between Commission and CommissionPayment.
    """
    __tablename__ = "commission_payment_items"

    payment_id = Column(UUID(as_uuid=True), ForeignKey("commission_payments.id", ondelete="CASCADE"), nullable=False)
    commission_id = Column(UUID(as_uuid=True), ForeignKey("commissions.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    payment = relationship("CommissionPayment", back_populates="payment_items")
    commission = relationship("Commission", back_populates="payment_items")
    
    __table_args__ = (
        PrimaryKeyConstraint('payment_id', 'commission_id'),
    )

    def __repr__(self):
        return f"<CommissionPaymentItem(payment_id='{self.payment_id}', commission_id='{self.commission_id}')>"