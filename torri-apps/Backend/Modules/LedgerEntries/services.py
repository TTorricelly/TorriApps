"""
LedgerEntries Services
Business logic for double-entry bookkeeping operations using SOLID principles.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from Core.Database.dependencies import get_db
from Core.Auth.models import User
from .models import LedgerEntry, LedgerTransaction, LedgerEntryType
from .schemas import (
    CreateLedgerEntryRequest,
    CreateLedgerTransactionRequest,
    LedgerEntryFilters,
    CreateReceivableJournalRequest,
    CreatePayableJournalRequest,
    CreatePaymentJournalRequest,
    AccountBalanceSchema,
    TrialBalanceResponse
)


# ============================================================================
# ABSTRACT INTERFACES (SOLID - Interface Segregation Principle)
# ============================================================================

class ILedgerEntryRepository(ABC):
    """Abstract repository interface for ledger entries."""
    
    @abstractmethod
    def create_entry(self, entry: LedgerEntry) -> LedgerEntry:
        """Create a single ledger entry."""
        pass
    
    @abstractmethod
    def create_transaction(self, entries: List[LedgerEntry]) -> List[LedgerEntry]:
        """Create a complete transaction with multiple entries."""
        pass
    
    @abstractmethod
    def get_by_id(self, entry_id: int) -> Optional[LedgerEntry]:
        """Get ledger entry by ID."""
        pass
    
    @abstractmethod
    def get_by_tx_id(self, tx_id: UUID) -> List[LedgerEntry]:
        """Get all entries for a transaction."""
        pass
    
    @abstractmethod
    def list_entries(self, filters: LedgerEntryFilters, skip: int, limit: int) -> Tuple[List[LedgerEntry], int]:
        """List ledger entries with filters and pagination."""
        pass
    
    @abstractmethod
    def get_account_balance(self, account_id: UUID, as_of_date: Optional[datetime] = None) -> AccountBalanceSchema:
        """Get account balance."""
        pass
    
    @abstractmethod
    def get_trial_balance(self, as_of_date: Optional[datetime] = None) -> TrialBalanceResponse:
        """Get trial balance for all accounts."""
        pass


class ILedgerEntryValidator(ABC):
    """Abstract validator interface for ledger entries."""
    
    @abstractmethod
    def validate_entry(self, entry_data: CreateLedgerEntryRequest) -> bool:
        """Validate a single ledger entry."""
        pass
    
    @abstractmethod
    def validate_transaction(self, transaction_data: CreateLedgerTransactionRequest) -> bool:
        """Validate a complete transaction."""
        pass


class IJournalEntryFactory(ABC):
    """Abstract factory interface for creating journal entries."""
    
    @abstractmethod
    def create_receivable_journal(self, data: CreateReceivableJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create receivable journal entry."""
        pass
    
    @abstractmethod
    def create_payable_journal(self, data: CreatePayableJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create payable journal entry."""
        pass
    
    @abstractmethod
    def create_payment_journal(self, data: CreatePaymentJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create payment journal entry."""
        pass


# ============================================================================
# CONCRETE IMPLEMENTATIONS
# ============================================================================

class LedgerEntryRepository(ILedgerEntryRepository):
    """Concrete repository implementation for ledger entries."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_entry(self, entry: LedgerEntry) -> LedgerEntry:
        """Create a single ledger entry."""
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
    
    def create_transaction(self, entries: List[LedgerEntry]) -> List[LedgerEntry]:
        """Create a complete transaction with multiple entries."""
        # Validate transaction balance before saving
        transaction = LedgerTransaction(entries)
        
        # Add all entries to session
        for entry in entries:
            self.db.add(entry)
        
        self.db.commit()
        
        # Refresh all entries
        for entry in entries:
            self.db.refresh(entry)
        
        return entries
    
    def get_by_id(self, entry_id: int) -> Optional[LedgerEntry]:
        """Get ledger entry by ID."""
        return self.db.query(LedgerEntry).filter(LedgerEntry.id == entry_id).first()
    
    def get_by_tx_id(self, tx_id: UUID) -> List[LedgerEntry]:
        """Get all entries for a transaction."""
        return self.db.query(LedgerEntry).filter(LedgerEntry.tx_id == tx_id).all()
    
    def list_entries(self, filters: LedgerEntryFilters, skip: int, limit: int) -> Tuple[List[LedgerEntry], int]:
        """List ledger entries with filters and pagination."""
        query = self.db.query(LedgerEntry)
        
        # Apply filters
        if filters.account_id:
            query = query.filter(LedgerEntry.account_id == filters.account_id)
        
        if filters.tx_id:
            query = query.filter(LedgerEntry.tx_id == filters.tx_id)
        
        if filters.currency:
            query = query.filter(LedgerEntry.currency == filters.currency)
        
        if filters.professional_id:
            query = query.filter(LedgerEntry.professional_id == filters.professional_id)
        
        if filters.event_id:
            query = query.filter(LedgerEntry.event_id == filters.event_id)
        
        if filters.payment_id:
            query = query.filter(LedgerEntry.payment_id == filters.payment_id)
        
        if filters.date_from:
            query = query.filter(LedgerEntry.created_at >= filters.date_from)
        
        if filters.date_to:
            query = query.filter(LedgerEntry.created_at <= filters.date_to)
        
        if filters.debit_only:
            query = query.filter(LedgerEntry.amount > 0)
        
        if filters.credit_only:
            query = query.filter(LedgerEntry.amount < 0)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        entries = query.order_by(desc(LedgerEntry.created_at)).offset(skip).limit(limit).all()
        
        return entries, total_count
    
    def get_account_balance(self, account_id: UUID, as_of_date: Optional[datetime] = None) -> AccountBalanceSchema:
        """Get account balance."""
        query = self.db.query(LedgerEntry).filter(LedgerEntry.account_id == account_id)
        
        if as_of_date:
            query = query.filter(LedgerEntry.created_at <= as_of_date)
        
        entries = query.all()
        
        debit_balance = sum(entry.debit_amount for entry in entries)
        credit_balance = sum(entry.credit_amount for entry in entries)
        net_balance = debit_balance - credit_balance
        
        # Get account info (assuming account relationship is loaded)
        account = entries[0].account if entries else None
        
        return AccountBalanceSchema(
            account_id=account_id,
            account_name=account.name if account else "Unknown",
            account_code=account.code if account else "Unknown",
            debit_balance=debit_balance,
            credit_balance=credit_balance,
            net_balance=net_balance,
            entry_count=len(entries)
        )
    
    def get_trial_balance(self, as_of_date: Optional[datetime] = None) -> TrialBalanceResponse:
        """Get trial balance for all accounts."""
        query = self.db.query(LedgerEntry)
        
        if as_of_date:
            query = query.filter(LedgerEntry.created_at <= as_of_date)
        
        # Group by account and calculate balances
        account_balances = {}
        entries = query.all()
        
        for entry in entries:
            account_id = entry.account_id
            if account_id not in account_balances:
                account_balances[account_id] = {
                    'account': entry.account,
                    'debit_balance': Decimal('0.00'),
                    'credit_balance': Decimal('0.00'),
                    'entry_count': 0
                }
            
            account_balances[account_id]['debit_balance'] += entry.debit_amount
            account_balances[account_id]['credit_balance'] += entry.credit_amount
            account_balances[account_id]['entry_count'] += 1
        
        # Convert to schema objects
        balance_schemas = []
        total_debits = Decimal('0.00')
        total_credits = Decimal('0.00')
        
        for account_id, balance_data in account_balances.items():
            account = balance_data['account']
            debit_balance = balance_data['debit_balance']
            credit_balance = balance_data['credit_balance']
            
            balance_schema = AccountBalanceSchema(
                account_id=account_id,
                account_name=account.name,
                account_code=account.code,
                debit_balance=debit_balance,
                credit_balance=credit_balance,
                net_balance=debit_balance - credit_balance,
                entry_count=balance_data['entry_count']
            )
            
            balance_schemas.append(balance_schema)
            total_debits += debit_balance
            total_credits += credit_balance
        
        return TrialBalanceResponse(
            account_balances=balance_schemas,
            total_debits=total_debits,
            total_credits=total_credits,
            is_balanced=total_debits == total_credits,
            as_of_date=as_of_date or datetime.utcnow()
        )


class LedgerEntryValidator(ILedgerEntryValidator):
    """Concrete validator implementation for ledger entries."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_entry(self, entry_data: CreateLedgerEntryRequest) -> bool:
        """Validate a single ledger entry."""
        # Validate account exists
        from Modules.Accounts.models import Account
        account = self.db.query(Account).filter(Account.id == entry_data.account_id).first()
        if not account:
            raise ValueError(f"Account {entry_data.account_id} not found")
        
        # Validate references exist if provided
        if entry_data.professional_id:
            from Modules.Professionals.models import Professional
            professional = self.db.query(Professional).filter(Professional.id == entry_data.professional_id).first()
            if not professional:
                raise ValueError(f"Professional {entry_data.professional_id} not found")
        
        if entry_data.event_id:
            from Modules.PayablesReceivables.models import PayableReceivable
            event = self.db.query(PayableReceivable).filter(PayableReceivable.id == entry_data.event_id).first()
            if not event:
                raise ValueError(f"PayableReceivable {entry_data.event_id} not found")
        
        if entry_data.payment_id:
            from Modules.Payments.models import PaymentHeader
            payment = self.db.query(PaymentHeader).filter(PaymentHeader.id == entry_data.payment_id).first()
            if not payment:
                raise ValueError(f"Payment {entry_data.payment_id} not found")
        
        return True
    
    def validate_transaction(self, transaction_data: CreateLedgerTransactionRequest) -> bool:
        """Validate a complete transaction."""
        # Validate each entry
        for entry_data in transaction_data.entries:
            self.validate_entry(entry_data)
        
        # Additional transaction-level validations are handled by the schema
        return True


class JournalEntryFactory(IJournalEntryFactory):
    """Concrete factory implementation for creating journal entries."""
    
    def create_receivable_journal(self, data: CreateReceivableJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create receivable journal entry (Dr. Customer, Cr. Revenue)."""
        
        debit_entry = CreateLedgerEntryRequest(
            account_id=data.customer_account_id,
            amount=data.amount,  # Positive for debit
            currency=data.currency,
            event_id=data.event_id,
            note=f"Receivable: {data.description}"
        )
        
        credit_entry = CreateLedgerEntryRequest(
            account_id=data.revenue_account_id,
            amount=-data.amount,  # Negative for credit
            currency=data.currency,
            event_id=data.event_id,
            note=f"Revenue: {data.description}"
        )
        
        return CreateLedgerTransactionRequest(
            entries=[debit_entry, credit_entry],
            transaction_note=f"Receivable journal: {data.description}"
        )
    
    def create_payable_journal(self, data: CreatePayableJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create payable journal entry (Dr. Expense, Cr. Supplier)."""
        
        debit_entry = CreateLedgerEntryRequest(
            account_id=data.expense_account_id,
            amount=data.amount,  # Positive for debit
            currency=data.currency,
            event_id=data.event_id,
            note=f"Expense: {data.description}"
        )
        
        credit_entry = CreateLedgerEntryRequest(
            account_id=data.supplier_account_id,
            amount=-data.amount,  # Negative for credit
            currency=data.currency,
            event_id=data.event_id,
            note=f"Payable: {data.description}"
        )
        
        return CreateLedgerTransactionRequest(
            entries=[debit_entry, credit_entry],
            transaction_note=f"Payable journal: {data.description}"
        )
    
    def create_payment_journal(self, data: CreatePaymentJournalRequest, user: User) -> CreateLedgerTransactionRequest:
        """Create payment journal entry."""
        
        if data.is_payment_received:
            # Payment received: Dr. Cash, Cr. Receivable
            debit_entry = CreateLedgerEntryRequest(
                account_id=data.cash_account_id,
                amount=data.amount,  # Positive for debit
                currency=data.currency,
                payment_id=data.payment_id,
                note=f"Payment received: {data.description}"
            )
            
            credit_entry = CreateLedgerEntryRequest(
                account_id=data.receivable_payable_account_id,
                amount=-data.amount,  # Negative for credit
                currency=data.currency,
                payment_id=data.payment_id,
                note=f"Receivable payment: {data.description}"
            )
        else:
            # Payment made: Dr. Payable, Cr. Cash
            debit_entry = CreateLedgerEntryRequest(
                account_id=data.receivable_payable_account_id,
                amount=data.amount,  # Positive for debit
                currency=data.currency,
                payment_id=data.payment_id,
                note=f"Payable payment: {data.description}"
            )
            
            credit_entry = CreateLedgerEntryRequest(
                account_id=data.cash_account_id,
                amount=-data.amount,  # Negative for credit
                currency=data.currency,
                payment_id=data.payment_id,
                note=f"Payment made: {data.description}"
            )
        
        return CreateLedgerTransactionRequest(
            entries=[debit_entry, credit_entry],
            transaction_note=f"Payment journal: {data.description}"
        )


# ============================================================================
# MAIN SERVICE CLASS (SOLID - Single Responsibility Principle)
# ============================================================================

class LedgerEntryService:
    """
    Main service class for ledger entry operations.
    
    Follows SOLID principles:
    - Single Responsibility: Orchestrates ledger entry operations
    - Open/Closed: Extensible through dependency injection
    - Liskov Substitution: Uses abstract interfaces
    - Interface Segregation: Depends on focused interfaces
    - Dependency Inversion: Depends on abstractions, not concretions
    """
    
    def __init__(
        self,
        repository: ILedgerEntryRepository,
        validator: ILedgerEntryValidator,
        journal_factory: IJournalEntryFactory,
        user: User
    ):
        self.repository = repository
        self.validator = validator
        self.journal_factory = journal_factory
        self.user = user
    
    def create_entry(self, entry_data: CreateLedgerEntryRequest) -> LedgerEntry:
        """Create a single ledger entry."""
        # Validate entry
        self.validator.validate_entry(entry_data)
        
        # Create domain object
        entry = LedgerEntry(
            account_id=entry_data.account_id,
            amount=entry_data.amount,
            currency=entry_data.currency,
            professional_id=entry_data.professional_id,
            event_id=entry_data.event_id,
            payment_id=entry_data.payment_id,
            note=entry_data.note,
            created_by=self.user.id
        )
        
        return self.repository.create_entry(entry)
    
    def create_transaction(self, transaction_data: CreateLedgerTransactionRequest) -> List[LedgerEntry]:
        """Create a complete double-entry transaction."""
        # Validate transaction
        self.validator.validate_transaction(transaction_data)
        
        # Generate transaction ID
        tx_id = uuid4()
        
        # Create domain objects
        entries = []
        for entry_data in transaction_data.entries:
            entry = LedgerEntry(
                tx_id=tx_id,
                account_id=entry_data.account_id,
                amount=entry_data.amount,
                currency=entry_data.currency,
                professional_id=entry_data.professional_id,
                event_id=entry_data.event_id,
                payment_id=entry_data.payment_id,
                note=entry_data.note or transaction_data.transaction_note,
                created_by=self.user.id
            )
            entries.append(entry)
        
        return self.repository.create_transaction(entries)
    
    def get_by_id(self, entry_id: int) -> Optional[LedgerEntry]:
        """Get ledger entry by ID."""
        return self.repository.get_by_id(entry_id)
    
    def get_transaction(self, tx_id: UUID) -> List[LedgerEntry]:
        """Get all entries for a transaction."""
        return self.repository.get_by_tx_id(tx_id)
    
    def list_entries(self, filters: LedgerEntryFilters, skip: int, limit: int) -> Tuple[List[LedgerEntry], int]:
        """List ledger entries with filters and pagination."""
        return self.repository.list_entries(filters, skip, limit)
    
    def get_account_balance(self, account_id: UUID, as_of_date: Optional[datetime] = None) -> AccountBalanceSchema:
        """Get account balance."""
        return self.repository.get_account_balance(account_id, as_of_date)
    
    def get_trial_balance(self, as_of_date: Optional[datetime] = None) -> TrialBalanceResponse:
        """Get trial balance for all accounts."""
        return self.repository.get_trial_balance(as_of_date)
    
    # High-level journal entry methods
    def create_receivable_journal(self, data: CreateReceivableJournalRequest) -> List[LedgerEntry]:
        """Create receivable journal entry."""
        transaction_data = self.journal_factory.create_receivable_journal(data, self.user)
        return self.create_transaction(transaction_data)
    
    def create_payable_journal(self, data: CreatePayableJournalRequest) -> List[LedgerEntry]:
        """Create payable journal entry."""
        transaction_data = self.journal_factory.create_payable_journal(data, self.user)
        return self.create_transaction(transaction_data)
    
    def create_payment_journal(self, data: CreatePaymentJournalRequest) -> List[LedgerEntry]:
        """Create payment journal entry."""
        transaction_data = self.journal_factory.create_payment_journal(data, self.user)
        return self.create_transaction(transaction_data)


# ============================================================================
# FACTORY FUNCTION (Dependency Injection)
# ============================================================================

def create_ledger_entry_service(db: Session, user: User) -> LedgerEntryService:
    """Factory function to create LedgerEntryService with dependencies."""
    repository = LedgerEntryRepository(db)
    validator = LedgerEntryValidator(db)
    journal_factory = JournalEntryFactory()
    
    return LedgerEntryService(
        repository=repository,
        validator=validator,
        journal_factory=journal_factory,
        user=user
    )