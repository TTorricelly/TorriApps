"""
PayablesReceivables Schemas
Pydantic models for payables/receivables data validation and serialization.
"""

from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator

from .models import Direction, PayableReceivableStatus, ReferenceType, InstallmentStatus


# ============================================================================
# INSTALLMENT SCHEMAS (defined first to avoid forward reference issues)
# ============================================================================

class PayableReceivableInstallmentSchema(BaseModel):
    """Schema for payable/receivable installment data."""
    
    id: UUID
    pr_id: UUID
    installment_number: int
    due_date: date
    original_amount: Decimal
    open_amount: Decimal
    status: InstallmentStatus
    payment_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_fully_paid: bool
    is_overdue: bool
    paid_amount: float
    
    class Config:
        from_attributes = True


class PayableReceivableSchema(BaseModel):
    """Schema for payable/receivable data."""
    
    id: UUID
    direction: Direction
    due_date: date
    original_amount: Decimal
    open_amount: Decimal
    counterparty: str
    status: PayableReceivableStatus
    reference_type: ReferenceType
    reference_id: UUID
    description: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_receivable: bool
    is_payable: bool
    is_fully_paid: bool
    is_overdue: bool
    paid_amount: float
    
    # Installments (optional, populated when needed)
    installments: Optional[List['PayableReceivableInstallmentSchema']] = None
    
    class Config:
        from_attributes = True


class CreatePayableReceivableRequest(BaseModel):
    """Request schema for creating a payable/receivable."""
    
    direction: Direction = Field(..., description="RECEIVABLE (money owed to us) or PAYABLE (money we owe)")
    due_date: date = Field(..., description="When payment is due")
    original_amount: Decimal = Field(..., gt=0, description="Original amount")
    counterparty: str = Field(..., min_length=1, max_length=255, description="Client name, supplier name, etc.")
    reference_type: ReferenceType = Field(..., description="Type of source entity")
    reference_id: UUID = Field(..., description="ID of source entity (appointment, supplier bill, etc.)")
    description: Optional[str] = Field(None, max_length=1000, description="Optional description")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes")
    
    @validator('due_date')
    def validate_due_date(cls, v):
        """Validate due date is not in the past."""
        if v < date.today():
            raise ValueError("Due date cannot be in the past")
        return v


class UpdatePayableReceivableRequest(BaseModel):
    """Request schema for updating a payable/receivable."""
    
    due_date: Optional[date] = Field(None, description="When payment is due")
    counterparty: Optional[str] = Field(None, min_length=1, max_length=255, description="Client name, supplier name, etc.")
    description: Optional[str] = Field(None, max_length=1000, description="Optional description")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes")
    
    @validator('due_date')
    def validate_due_date(cls, v):
        """Validate due date is not in the past."""
        if v and v < date.today():
            raise ValueError("Due date cannot be in the past")
        return v


class ApplyPaymentRequest(BaseModel):
    """Request schema for applying a payment to a payable/receivable."""
    
    payment_amount: Decimal = Field(..., gt=0, description="Amount being paid")
    payment_notes: Optional[str] = Field(None, max_length=500, description="Optional payment notes")


class PayableReceivableResponse(BaseModel):
    """Response schema for payable/receivable operations."""
    
    payable_receivable: PayableReceivableSchema
    message: str = "Operation completed successfully"
    
    class Config:
        from_attributes = True


class PayableReceivableListResponse(BaseModel):
    """Response schema for payable/receivable list operations."""
    
    items: List[PayableReceivableSchema]
    total_count: int
    total_receivables_amount: Decimal = Field(default=Decimal('0.00'), description="Total amount of open receivables")
    total_payables_amount: Decimal = Field(default=Decimal('0.00'), description="Total amount of open payables")
    overdue_count: int = Field(default=0, description="Number of overdue items")
    
    class Config:
        from_attributes = True


class CashflowSummaryResponse(BaseModel):
    """Response schema for cashflow summary."""
    
    total_receivables: Decimal = Field(description="Total open receivables")
    total_payables: Decimal = Field(description="Total open payables")
    net_cashflow: Decimal = Field(description="Net cashflow (receivables - payables)")
    overdue_receivables: Decimal = Field(description="Overdue receivables amount")
    overdue_payables: Decimal = Field(description="Overdue payables amount")
    overdue_receivables_count: int = Field(description="Number of overdue receivables")
    overdue_payables_count: int = Field(description="Number of overdue payables")
    
    class Config:
        from_attributes = True


class PayableReceivableFilters(BaseModel):
    """Filters for querying payables/receivables."""
    
    direction: Optional[Direction] = Field(None, description="Filter by direction")
    status: Optional[PayableReceivableStatus] = Field(None, description="Filter by status")
    reference_type: Optional[ReferenceType] = Field(None, description="Filter by reference type")
    counterparty: Optional[str] = Field(None, description="Filter by counterparty (partial match)")
    due_date_from: Optional[date] = Field(None, description="Filter by due date from")
    due_date_to: Optional[date] = Field(None, description="Filter by due date to")
    overdue_only: Optional[bool] = Field(False, description="Show only overdue items")
    
    @validator('due_date_to')
    def validate_date_range(cls, v, values):
        """Validate date range."""
        if v and values.get('due_date_from') and v < values['due_date_from']:
            raise ValueError("due_date_to must be after due_date_from")
        return v


# ============================================================================
# INSTALLMENT REQUEST/RESPONSE SCHEMAS
# ============================================================================

class CreateInstallmentRequest(BaseModel):
    """Request schema for creating installments."""
    
    installment_number: int = Field(..., gt=0, description="Installment number (1, 2, 3, etc.)")
    due_date: date = Field(..., description="When this installment is due")
    amount: Decimal = Field(..., gt=0, description="Amount for this installment")
    
    @validator('due_date')
    def validate_due_date(cls, v):
        """Validate due date is not in the past."""
        if v < date.today():
            raise ValueError("Due date cannot be in the past")
        return v


class CreateInstallmentPlanRequest(BaseModel):
    """Request schema for creating multiple installments at once."""
    
    number_of_installments: int = Field(..., gt=0, le=12, description="Number of installments (max 12)")
    first_due_date: date = Field(..., description="Due date for first installment")
    interval_days: int = Field(30, gt=0, le=365, description="Days between installments (default 30)")
    
    @validator('first_due_date')
    def validate_first_due_date(cls, v):
        """Validate first due date is not in the past."""
        if v < date.today():
            raise ValueError("First due date cannot be in the past")
        return v


class ApplyInstallmentPaymentRequest(BaseModel):
    """Request schema for applying payment to an installment."""
    
    payment_amount: Decimal = Field(..., gt=0, description="Amount being paid")
    payment_notes: Optional[str] = Field(None, max_length=500, description="Optional payment notes")


class InstallmentResponse(BaseModel):
    """Response schema for installment operations."""
    
    installment: PayableReceivableInstallmentSchema
    message: str = "Operation completed successfully"
    
    class Config:
        from_attributes = True


class InstallmentListResponse(BaseModel):
    """Response schema for installment list operations."""
    
    installments: List[PayableReceivableInstallmentSchema]
    total_count: int
    total_open_amount: Decimal = Field(default=Decimal('0.00'), description="Total open amount across all installments")
    overdue_count: int = Field(default=0, description="Number of overdue installments")
    
    class Config:
        from_attributes = True