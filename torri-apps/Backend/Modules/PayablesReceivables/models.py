"""
PayablesReceivables Models
Handles accounts payable and receivable transactions for cashflow management.
"""

from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Config.Database import Base
import uuid
from enum import Enum as PyEnum


class Direction(PyEnum):
    RECEIVABLE = "RECEIVABLE"
    PAYABLE = "PAYABLE"


class PayableReceivableStatus(PyEnum):
    OPEN = "OPEN"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class ReferenceType(PyEnum):
    APPOINTMENT = "APPOINTMENT"
    SUPPLIER_BILL = "SUPPLIER_BILL"
    MANUAL_ENTRY = "MANUAL_ENTRY"
    # Add more reference types as needed


class InstallmentStatus(PyEnum):
    OPEN = "OPEN"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


# Create PostgreSQL ENUM types
direction_enum = ENUM(Direction, name='direction_enum', create_type=False)
payable_receivable_status_enum = ENUM(PayableReceivableStatus, name='payable_receivable_status_enum', create_type=False)
reference_type_enum = ENUM(ReferenceType, name='reference_type_enum', create_type=False)
installment_status_enum = ENUM(InstallmentStatus, name='installment_status_enum', create_type=False)


class PayableReceivable(Base):
    """
    Main entity for tracking accounts payable and receivable.
    Follows Domain-Driven Design principles for financial transactions.
    """
    __tablename__ = "payables_receivables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Direction: whether this is money we owe (PAYABLE) or money owed to us (RECEIVABLE)
    direction = Column(direction_enum, nullable=False, index=True)
    
    # Financial details
    due_date = Column(Date, nullable=False, index=True)
    original_amount = Column(Numeric(18, 2), nullable=False)
    open_amount = Column(Numeric(18, 2), nullable=False)  # Amount still unpaid
    
    # Counterparty information
    counterparty = Column(String(255), nullable=False, index=True)  # Client name, supplier name, etc.
    
    # Status tracking
    status = Column(payable_receivable_status_enum, default=PayableReceivableStatus.OPEN, nullable=False, index=True)
    
    # Polymorphic reference to source entity (appointment, supplier bill, etc.)
    reference_type = Column(reference_type_enum, nullable=False, index=True)
    reference_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Additional metadata
    description = Column(Text, nullable=True)  # Optional description
    notes = Column(Text, nullable=True)  # Optional notes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    installments = relationship("PayableReceivableInstallment", back_populates="payable_receivable", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PayableReceivable(id={self.id}, direction={self.direction.value}, amount={self.open_amount}, counterparty='{self.counterparty}')>"
    
    @property
    def is_receivable(self) -> bool:
        """Check if this is a receivable (money owed to us)"""
        return self.direction == Direction.RECEIVABLE
    
    @property
    def is_payable(self) -> bool:
        """Check if this is a payable (money we owe)"""
        return self.direction == Direction.PAYABLE
    
    @property
    def is_fully_paid(self) -> bool:
        """Check if this has been fully paid"""
        return self.status == PayableReceivableStatus.PAID
    
    @property
    def is_overdue(self) -> bool:
        """Check if this is overdue (past due date and not fully paid)"""
        from datetime import date
        return (
            self.due_date < date.today() and 
            self.status not in [PayableReceivableStatus.PAID, PayableReceivableStatus.CANCELLED]
        )
    
    @property
    def paid_amount(self) -> float:
        """Calculate how much has been paid"""
        return float(self.original_amount - self.open_amount)
    
    def mark_as_paid(self):
        """Mark this payable/receivable as fully paid"""
        self.open_amount = 0
        self.status = PayableReceivableStatus.PAID
    
    def mark_as_cancelled(self):
        """Mark this payable/receivable as cancelled"""
        self.status = PayableReceivableStatus.CANCELLED
    
    def apply_payment(self, payment_amount: float):
        """
        Apply a partial payment to this payable/receivable.
        
        Args:
            payment_amount: Amount being paid
            
        Raises:
            ValueError: If payment amount is invalid
        """
        if payment_amount <= 0:
            raise ValueError("Payment amount must be positive")
        
        if payment_amount > float(self.open_amount):
            raise ValueError("Payment amount cannot exceed open amount")
        
        self.open_amount -= payment_amount
        
        if self.open_amount == 0:
            self.status = PayableReceivableStatus.PAID
        elif self.open_amount < self.original_amount:
            self.status = PayableReceivableStatus.PARTIAL


class PayableReceivableInstallment(Base):
    """
    Individual installments for payables/receivables.
    Allows breaking down payments into multiple due dates.
    """
    __tablename__ = "pr_installments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to parent payable/receivable
    pr_id = Column(UUID(as_uuid=True), ForeignKey('payables_receivables.id'), nullable=False, index=True)
    
    # Installment details
    installment_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    due_date = Column(Date, nullable=False, index=True)
    original_amount = Column(Numeric(18, 2), nullable=False)
    open_amount = Column(Numeric(18, 2), nullable=False)  # Amount still unpaid for this installment
    
    # Status tracking
    status = Column(installment_status_enum, default=InstallmentStatus.OPEN, nullable=False, index=True)
    
    # Payment tracking
    payment_notes = Column(Text, nullable=True)  # Notes about payments made to this installment
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    payable_receivable = relationship("PayableReceivable", back_populates="installments")
    
    def __repr__(self):
        return f"<PayableReceivableInstallment(id={self.id}, pr_id={self.pr_id}, number={self.installment_number}, amount={self.open_amount})>"
    
    @property
    def is_fully_paid(self) -> bool:
        """Check if this installment has been fully paid"""
        return self.status == InstallmentStatus.PAID
    
    @property
    def is_overdue(self) -> bool:
        """Check if this installment is overdue"""
        from datetime import date
        return (
            self.due_date < date.today() and 
            self.status not in [InstallmentStatus.PAID, InstallmentStatus.CANCELLED]
        )
    
    @property
    def paid_amount(self) -> float:
        """Calculate how much has been paid for this installment"""
        return float(self.original_amount - self.open_amount)
    
    def mark_as_paid(self):
        """Mark this installment as fully paid"""
        self.open_amount = 0
        self.status = InstallmentStatus.PAID
    
    def mark_as_cancelled(self):
        """Mark this installment as cancelled"""
        self.status = InstallmentStatus.CANCELLED
    
    def apply_payment(self, payment_amount: float, notes: str = None):
        """
        Apply a partial payment to this installment.
        
        Args:
            payment_amount: Amount being paid
            notes: Optional payment notes
            
        Raises:
            ValueError: If payment amount is invalid
        """
        if payment_amount <= 0:
            raise ValueError("Payment amount must be positive")
        
        if payment_amount > float(self.open_amount):
            raise ValueError("Payment amount cannot exceed open amount")
        
        self.open_amount -= payment_amount
        
        if self.open_amount == 0:
            self.status = InstallmentStatus.PAID
        elif self.open_amount < self.original_amount:
            self.status = InstallmentStatus.PARTIAL
        
        # Add payment notes if provided
        if notes:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            payment_note = f"[{timestamp}] Payment: {payment_amount} - {notes}"
            if self.payment_notes:
                self.payment_notes = f"{self.payment_notes}\n{payment_note}"
            else:
                self.payment_notes = payment_note