"""
LedgerEntries Schemas
Pydantic models for ledger entries data validation and serialization.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator, root_validator

from .models import LedgerEntryType


class LedgerEntrySchema(BaseModel):
    """Schema for ledger entry data."""
    
    id: int
    tx_id: UUID
    account_id: UUID
    amount: Decimal
    currency: str
    professional_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    payment_id: Optional[UUID] = None
    note: Optional[str] = None
    created_at: datetime
    created_by: Optional[UUID] = None
    
    # Computed properties
    is_debit: bool
    is_credit: bool
    debit_amount: Decimal
    credit_amount: Decimal
    
    class Config:
        from_attributes = True


class CreateLedgerEntryRequest(BaseModel):
    """Request schema for creating a single ledger entry."""
    
    account_id: UUID = Field(..., description="Account to debit or credit")
    amount: Decimal = Field(..., description="Amount (positive for debit, negative for credit)")
    currency: str = Field("BRL", description="Currency code (ISO 4217)")
    professional_id: Optional[UUID] = Field(None, description="Related professional")
    event_id: Optional[UUID] = Field(None, description="Related payable/receivable")
    payment_id: Optional[UUID] = Field(None, description="Related payment")
    note: Optional[str] = Field(None, max_length=1000, description="Entry description")
    
    @validator('amount')
    def validate_amount(cls, v):
        """Validate amount is not zero."""
        if v == 0:
            raise ValueError("Amount cannot be zero")
        return v
    
    @validator('currency')
    def validate_currency(cls, v):
        """Validate currency is 3-character code."""
        if len(v) != 3:
            raise ValueError("Currency must be 3-character ISO code")
        return v.upper()
    
    @root_validator
    def validate_references(cls, values):
        """Validate that only one reference type is provided."""
        refs = [values.get('professional_id'), values.get('event_id'), values.get('payment_id')]
        non_null_refs = [ref for ref in refs if ref is not None]
        
        if len(non_null_refs) > 1:
            raise ValueError("Only one reference (professional, event, or payment) can be provided")
        
        return values


class CreateLedgerTransactionRequest(BaseModel):
    """Request schema for creating a complete double-entry transaction."""
    
    entries: List[CreateLedgerEntryRequest] = Field(..., min_items=2, description="List of ledger entries")
    transaction_note: Optional[str] = Field(None, max_length=1000, description="Transaction description")
    
    @validator('entries')
    def validate_entries(cls, v):
        """Validate entries form a balanced transaction."""
        if len(v) < 2:
            raise ValueError("Transaction must have at least 2 entries")
        
        # Check currency consistency
        currencies = {entry.currency for entry in v}
        if len(currencies) != 1:
            raise ValueError("All entries must have the same currency")
        
        # Check transaction balances
        total_debits = sum(entry.amount for entry in v if entry.amount > 0)
        total_credits = sum(abs(entry.amount) for entry in v if entry.amount < 0)
        
        if total_debits != total_credits:
            raise ValueError(f"Transaction not balanced: debits={total_debits}, credits={total_credits}")
        
        return v


class LedgerTransactionSchema(BaseModel):
    """Schema for a complete ledger transaction."""
    
    tx_id: UUID
    entries: List[LedgerEntrySchema]
    currency: str
    total_amount: Decimal
    created_at: datetime
    created_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class LedgerEntryResponse(BaseModel):
    """Response schema for ledger entry operations."""
    
    entry: LedgerEntrySchema
    message: str = "Operation completed successfully"
    
    class Config:
        from_attributes = True


class LedgerTransactionResponse(BaseModel):
    """Response schema for ledger transaction operations."""
    
    transaction: LedgerTransactionSchema
    message: str = "Transaction created successfully"
    
    class Config:
        from_attributes = True


class LedgerEntryListResponse(BaseModel):
    """Response schema for ledger entry list operations."""
    
    entries: List[LedgerEntrySchema]
    total_count: int
    total_debits: Decimal = Field(default=Decimal('0.00'), description="Total debit amount")
    total_credits: Decimal = Field(default=Decimal('0.00'), description="Total credit amount")
    
    class Config:
        from_attributes = True


class LedgerEntryFilters(BaseModel):
    """Filters for querying ledger entries."""
    
    account_id: Optional[UUID] = Field(None, description="Filter by account")
    tx_id: Optional[UUID] = Field(None, description="Filter by transaction ID")
    currency: Optional[str] = Field(None, description="Filter by currency")
    professional_id: Optional[UUID] = Field(None, description="Filter by professional")
    event_id: Optional[UUID] = Field(None, description="Filter by payable/receivable")
    payment_id: Optional[UUID] = Field(None, description="Filter by payment")
    date_from: Optional[datetime] = Field(None, description="Filter by date from")
    date_to: Optional[datetime] = Field(None, description="Filter by date to")
    debit_only: Optional[bool] = Field(False, description="Show only debit entries")
    credit_only: Optional[bool] = Field(False, description="Show only credit entries")
    
    @validator('currency')
    def validate_currency(cls, v):
        """Validate currency is 3-character code."""
        if v and len(v) != 3:
            raise ValueError("Currency must be 3-character ISO code")
        return v.upper() if v else v
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        """Validate date range."""
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError("date_to must be after date_from")
        return v


class AccountBalanceSchema(BaseModel):
    """Schema for account balance information."""
    
    account_id: UUID
    account_name: str
    account_code: str
    debit_balance: Decimal
    credit_balance: Decimal
    net_balance: Decimal
    entry_count: int
    
    class Config:
        from_attributes = True


class TrialBalanceResponse(BaseModel):
    """Response schema for trial balance report."""
    
    account_balances: List[AccountBalanceSchema]
    total_debits: Decimal
    total_credits: Decimal
    is_balanced: bool
    as_of_date: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# JOURNAL ENTRY TEMPLATES (for common transactions)
# ============================================================================

class JournalEntryTemplate(BaseModel):
    """Template for common journal entry patterns."""
    
    name: str
    description: str
    entry_type: LedgerEntryType
    debit_account_id: UUID
    credit_account_id: UUID
    
    class Config:
        from_attributes = True


class CreateReceivableJournalRequest(BaseModel):
    """Request for creating receivable journal entry."""
    
    customer_account_id: UUID = Field(..., description="Customer account (debit)")
    revenue_account_id: UUID = Field(..., description="Revenue account (credit)")
    amount: Decimal = Field(..., gt=0, description="Amount of receivable")
    currency: str = Field("BRL", description="Currency code")
    event_id: UUID = Field(..., description="Related payable/receivable ID")
    description: str = Field(..., description="Entry description")


class CreatePayableJournalRequest(BaseModel):
    """Request for creating payable journal entry."""
    
    expense_account_id: UUID = Field(..., description="Expense account (debit)")
    supplier_account_id: UUID = Field(..., description="Supplier account (credit)")
    amount: Decimal = Field(..., gt=0, description="Amount of payable")
    currency: str = Field("BRL", description="Currency code")
    event_id: UUID = Field(..., description="Related payable/receivable ID")
    description: str = Field(..., description="Entry description")


class CreatePaymentJournalRequest(BaseModel):
    """Request for creating payment journal entry."""
    
    cash_account_id: UUID = Field(..., description="Cash/Bank account")
    receivable_payable_account_id: UUID = Field(..., description="Receivable/Payable account")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field("BRL", description="Currency code")
    payment_id: UUID = Field(..., description="Related payment ID")
    is_payment_received: bool = Field(..., description="True for payment received, False for payment made")
    description: str = Field(..., description="Entry description")