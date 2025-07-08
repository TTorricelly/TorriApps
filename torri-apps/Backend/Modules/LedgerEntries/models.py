"""
LedgerEntries Models
Domain models for double-entry bookkeeping ledger entries.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, DECIMAL, BigInteger, Integer
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

from Core.Database.database import Base
from Core.Database.mixins import TenantMixin


class LedgerEntryType(str, Enum):
    """Types of ledger entries based on business events."""
    RECEIVABLE = "RECEIVABLE"          # Customer payment due
    PAYABLE = "PAYABLE"                # Supplier payment due
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"  # Customer payment received
    PAYMENT_MADE = "PAYMENT_MADE"      # Supplier payment made
    REVENUE = "REVENUE"                # Service revenue recognition
    EXPENSE = "EXPENSE"                # Expense recognition
    ADJUSTMENT = "ADJUSTMENT"          # Manual accounting adjustment
    OPENING_BALANCE = "OPENING_BALANCE"  # Opening balance entry


class LedgerEntry(Base, TenantMixin):
    """
    Double-entry bookkeeping ledger entry.
    
    Domain invariants:
    - Each transaction (tx_id) must have balanced debits and credits
    - Amount is positive for debits, negative for credits
    - Currency must be valid ISO 4217 code
    - Professional, event, and payment references are optional but mutually exclusive for clarity
    """
    
    __tablename__ = "ledger_entries"
    
    # Primary key
    id = Column(BigInteger, primary_key=True, index=True)
    
    # Transaction grouping - groups the two legs of double-entry
    tx_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    
    # Account reference - using String to match accounts table
    account_id = Column(
        String(36), 
        ForeignKey("accounts.id", ondelete="RESTRICT"), 
        nullable=False,
        index=True
    )
    
    # Amount (positive = debit, negative = credit)
    amount = Column(DECIMAL(18, 2), nullable=False)
    
    # Currency
    currency = Column(String(3), nullable=False, default="BRL")
    
    # Optional references to business events
    professional_id = Column(
        PostgresUUID(as_uuid=True), 
        ForeignKey("professionals.id", ondelete="SET NULL"), 
        nullable=True,
        index=True
    )
    
    event_id = Column(
        PostgresUUID(as_uuid=True), 
        ForeignKey("payables_receivables.id", ondelete="SET NULL"), 
        nullable=True,
        index=True
    )
    
    payment_id = Column(
        PostgresUUID(as_uuid=True), 
        ForeignKey("payment_headers.id", ondelete="SET NULL"), 
        nullable=True,
        index=True
    )
    
    # Entry description and notes
    note = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(
        PostgresUUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )
    
    # Relationships
    account = relationship("Account", back_populates="ledger_entries")
    professional = relationship("Professional", back_populates="ledger_entries")
    payable_receivable = relationship("PayableReceivable", back_populates="ledger_entries")
    payment_header = relationship("PaymentHeader", back_populates="ledger_entries")
    created_by_user = relationship("User", back_populates="created_ledger_entries")
    
    def __init__(self, **kwargs):
        """Initialize with domain validation."""
        super().__init__(**kwargs)
        
        # Generate tx_id if not provided
        if not self.tx_id:
            self.tx_id = uuid4()
    
    @validates('amount')
    def validate_amount(self, key, amount):
        """Validate amount is not zero."""
        if amount == 0:
            raise ValueError("Ledger entry amount cannot be zero")
        return amount
    
    @validates('currency')
    def validate_currency(self, key, currency):
        """Validate currency is 3-character ISO code."""
        if not currency or len(currency) != 3:
            raise ValueError("Currency must be 3-character ISO code")
        return currency.upper()
    
    @hybrid_property
    def is_debit(self) -> bool:
        """Check if this entry is a debit (positive amount)."""
        return self.amount > 0
    
    @hybrid_property
    def is_credit(self) -> bool:
        """Check if this entry is a credit (negative amount)."""
        return self.amount < 0
    
    @hybrid_property
    def debit_amount(self) -> Decimal:
        """Get debit amount (positive) or zero."""
        return self.amount if self.amount > 0 else Decimal('0.00')
    
    @hybrid_property
    def credit_amount(self) -> Decimal:
        """Get credit amount (positive) or zero."""
        return abs(self.amount) if self.amount < 0 else Decimal('0.00')
    
    def __repr__(self):
        return f"<LedgerEntry(id={self.id}, tx_id={self.tx_id}, account_id={self.account_id}, amount={self.amount})>"


class LedgerTransaction:
    """
    Value object representing a complete double-entry transaction.
    
    Domain invariants:
    - Must have exactly 2 or more entries
    - Total debits must equal total credits
    - All entries must have the same tx_id
    - All entries must have the same currency
    """
    
    def __init__(self, entries: list[LedgerEntry]):
        if len(entries) < 2:
            raise ValueError("Transaction must have at least 2 entries")
        
        # Validate all entries have same tx_id
        tx_ids = {entry.tx_id for entry in entries}
        if len(tx_ids) != 1:
            raise ValueError("All entries must have the same tx_id")
        
        # Validate all entries have same currency
        currencies = {entry.currency for entry in entries}
        if len(currencies) != 1:
            raise ValueError("All entries must have the same currency")
        
        # Validate transaction balances
        total_debits = sum(entry.debit_amount for entry in entries)
        total_credits = sum(entry.credit_amount for entry in entries)
        
        if total_debits != total_credits:
            raise ValueError(f"Transaction not balanced: debits={total_debits}, credits={total_credits}")
        
        self.entries = entries
        self.tx_id = entries[0].tx_id
        self.currency = entries[0].currency
    
    @property
    def total_amount(self) -> Decimal:
        """Get total transaction amount (debit side)."""
        return sum(entry.debit_amount for entry in self.entries)
    
    @property
    def debit_entries(self) -> list[LedgerEntry]:
        """Get all debit entries."""
        return [entry for entry in self.entries if entry.is_debit]
    
    @property
    def credit_entries(self) -> list[LedgerEntry]:
        """Get all credit entries."""
        return [entry for entry in self.entries if entry.is_credit]
    
    def __repr__(self):
        return f"<LedgerTransaction(tx_id={self.tx_id}, entries={len(self.entries)}, amount={self.total_amount})>"