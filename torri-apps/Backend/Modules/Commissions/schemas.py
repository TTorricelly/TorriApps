from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from .constants import CommissionPaymentStatus, CommissionPaymentMethod


# Commission Schemas

class CommissionBase(BaseModel):
    """Base commission schema with common fields."""
    service_price: Decimal = Field(..., ge=0, description="Service price at time of booking")
    commission_percentage: Decimal = Field(..., ge=0, le=100, description="Commission percentage (0-100)")
    calculated_value: Decimal = Field(..., ge=0, description="Calculated commission value")
    adjusted_value: Optional[Decimal] = Field(None, ge=0, description="Manually adjusted commission value")
    adjustment_reason: Optional[str] = Field(None, description="Reason for adjustment")
    payment_status: CommissionPaymentStatus = Field(default=CommissionPaymentStatus.PENDING)


class CommissionCreate(CommissionBase):
    """Schema for creating a new commission."""
    professional_id: UUID
    appointment_id: UUID


class CommissionUpdate(BaseModel):
    """Schema for updating a commission."""
    adjusted_value: Optional[Decimal] = Field(None, ge=0)
    adjustment_reason: Optional[str] = None
    payment_status: Optional[CommissionPaymentStatus] = None


class CommissionResponse(CommissionBase):
    """Schema for commission API responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    professional_id: UUID
    appointment_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Computed fields (to be added by service layer)
    professional_name: Optional[str] = None
    service_name: Optional[str] = None
    appointment_date: Optional[date] = None
    final_value: Optional[Decimal] = None  # adjusted_value or calculated_value


# Commission Payment Schemas

class CommissionPaymentBase(BaseModel):
    """Base commission payment schema."""
    total_amount: Decimal = Field(..., gt=0, description="Total payment amount")
    payment_method: CommissionPaymentMethod
    payment_date: date
    period_start: date
    period_end: date
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class CommissionPaymentCreate(CommissionPaymentBase):
    """Schema for creating a commission payment."""
    professional_id: UUID
    commission_ids: List[UUID] = Field(..., min_items=1, description="List of commission IDs to pay")


class CommissionPaymentResponse(CommissionPaymentBase):
    """Schema for commission payment API responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    professional_id: UUID
    created_at: datetime
    
    # Computed fields
    professional_name: Optional[str] = None
    commission_count: Optional[int] = None


# Filter and Query Schemas

class CommissionFilters(BaseModel):
    """Schema for filtering commission queries."""
    professional_id: Optional[UUID] = None
    payment_status: Optional[CommissionPaymentStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class CommissionKPIs(BaseModel):
    """Schema for commission dashboard KPIs."""
    total_pending: Decimal = Field(default=Decimal('0.00'), description="Total pending commission amount")
    total_paid: Decimal = Field(default=Decimal('0.00'), description="Total paid commission amount")
    total_this_period: Decimal = Field(default=Decimal('0.00'), description="Total commissions for current period")
    last_payment_date: Optional[date] = Field(None, description="Date of last payment")
    last_payment_amount: Optional[Decimal] = Field(None, description="Amount of last payment")
    commission_count: int = Field(default=0, description="Total number of commissions")
    pending_count: int = Field(default=0, description="Number of pending commissions")


# Export Schemas

class CommissionExportRow(BaseModel):
    """Schema for commission CSV export rows."""
    professional_name: str
    appointment_date: date
    service_name: str
    service_price: Decimal
    commission_percentage: Decimal
    calculated_value: Decimal
    adjusted_value: Optional[Decimal]
    final_value: Decimal
    payment_status: str
    payment_date: Optional[date]
    created_at: datetime


# Utility Schemas

class BulkCommissionUpdate(BaseModel):
    """Schema for bulk commission operations."""
    commission_ids: List[UUID] = Field(..., min_items=1)
    payment_status: Optional[CommissionPaymentStatus] = None
    action: str = Field(..., description="Action to perform: 'mark_paid', 'mark_pending', etc.")


class CommissionSummary(BaseModel):
    """Schema for commission summary by professional."""
    professional_id: UUID
    professional_name: str
    total_commissions: int
    total_pending: Decimal
    total_paid: Decimal
    last_commission_date: Optional[date]