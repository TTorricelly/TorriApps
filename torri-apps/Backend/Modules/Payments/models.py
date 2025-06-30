"""
Payment Models
Handles customer payment transactions and related items.
"""

from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Core.Database.base import Base
import uuid
from enum import Enum as PyEnum


class PaymentStatus(PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(PyEnum):
    CASH = "cash"
    DEBIT = "debit"
    CREDIT = "credit"
    PIX = "pix"


class ItemType(PyEnum):
    APPOINTMENT_GROUP = "appointment_group"
    RETAIL_PRODUCT = "retail_product"


# Create PostgreSQL ENUM types
payment_status_enum = ENUM(PaymentStatus, name='payment_status_enum', create_type=False)
payment_method_enum = ENUM(PaymentMethod, name='payment_method_enum', create_type=False)
item_type_enum = ENUM(ItemType, name='item_type_enum', create_type=False)


class Payment(Base):
    """
    Main payment record for customer transactions.
    """
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(String(100), unique=True, nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Amount breakdown
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    tip_amount = Column(Numeric(10, 2), default=0, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # Payment details
    payment_method = Column(payment_method_enum, nullable=False)
    payment_status = Column(payment_status_enum, default=PaymentStatus.COMPLETED, nullable=False)
    processor_transaction_id = Column(String(255), nullable=True)  # For future payment gateway integration
    
    # Notes and metadata
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Internal relationships only (no external model dependencies)
    payment_items = relationship("PaymentItem", back_populates="payment", cascade="all, delete-orphan")


class PaymentItem(Base):
    """
    Individual items within a payment (appointment groups or retail products).
    """
    __tablename__ = "payment_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey('payments.id'), nullable=False)
    
    # Item identification
    item_type = Column(item_type_enum, nullable=False)
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # appointment_group_id OR NULL for retail
    item_name = Column(String(255), nullable=False)  # service names OR product name
    
    # Pricing
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)  # unit_price * quantity
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Internal relationships only (no external model dependencies)
    payment = relationship("Payment", back_populates="payment_items")