"""
Payment Schemas
Pydantic models for payment data validation and serialization.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator

from .models import PaymentMethod, PaymentStatus, ItemType


class AccountInfoSchema(BaseModel):
    """Schema for account information in payment responses."""
    
    id: str
    code: str
    name: str
    
    class Config:
        from_attributes = True


class PaymentItemSchema(BaseModel):
    """Schema for payment item data."""
    
    id: UUID
    payment_header_id: UUID
    item_type: ItemType
    reference_id: Optional[UUID]
    item_name: str
    unit_price: Decimal
    quantity: int
    total_amount: Decimal
    created_at: datetime
    
    # Keep old field name for backward compatibility
    @property
    def payment_id(self) -> UUID:
        return self.payment_header_id
    
    class Config:
        from_attributes = True


class PaymentSchema(BaseModel):
    """Schema for payment data."""
    
    id: UUID
    payment_id: str
    client_id: UUID
    subtotal: Decimal
    discount_amount: Decimal
    tip_amount: Decimal
    total_amount: Decimal
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    processor_transaction_id: Optional[str]
    account_id: Optional[str] = Field(None, description="Account ID for accounting integration")
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    payment_items: List[PaymentItemSchema] = []
    
    # Account information (populated if account_id is present)
    account_info: Optional[AccountInfoSchema] = Field(None, description="Account information for accounting integration")
    
    class Config:
        from_attributes = True


class CreatePaymentRequest(BaseModel):
    """Request schema for creating a payment."""
    
    client_id: Optional[UUID] = Field(None, description="Client ID (auto-detected if not provided)")
    group_ids: List[UUID] = Field(..., description="List of appointment group IDs")
    subtotal: Decimal = Field(..., gt=0, description="Subtotal amount")
    discount_amount: Decimal = Field(default=Decimal('0.00'), ge=0, description="Discount amount")
    tip_amount: Decimal = Field(default=Decimal('0.00'), ge=0, description="Tip amount")
    total_amount: Decimal = Field(..., gt=0, description="Total amount")
    payment_method: str = Field(..., description="Payment method (cash, debit, credit, pix)")
    account_id: Optional[str] = Field(None, description="Account ID for accounting integration")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional payment notes")
    
    @validator('payment_method')
    def validate_payment_method(cls, v):
        """Validate payment method."""
        try:
            PaymentMethod(v.lower())
            return v.lower()
        except ValueError:
            raise ValueError(f"Invalid payment method. Must be one of: {[method.value for method in PaymentMethod]}")
    
    @validator('total_amount')
    def validate_total_amount(cls, v, values):
        """Validate that total amount matches subtotal - discount + tip."""
        if 'subtotal' in values and 'discount_amount' in values and 'tip_amount' in values:
            expected_total = values['subtotal'] - values['discount_amount'] + values['tip_amount']
            if abs(v - expected_total) > Decimal('0.01'):
                raise ValueError(f"Total amount {v} does not match calculated total {expected_total}")
        return v


class PaymentResponse(BaseModel):
    """Response schema for payment operations."""
    
    payment: PaymentSchema
    message: str = "Payment processed successfully"
    
    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Response schema for payment list operations."""
    
    payments: List[PaymentSchema]
    total_count: int
    
    class Config:
        from_attributes = True