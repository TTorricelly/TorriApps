"""
LedgerEntries Routes
RESTful API endpoints for ledger entries and double-entry bookkeeping operations.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.models import User
from Core.Auth.constants import UserRole

from .services import create_ledger_entry_service
from .schemas import (
    LedgerEntrySchema,
    LedgerTransactionSchema,
    CreateLedgerEntryRequest,
    CreateLedgerTransactionRequest,
    CreateReceivableJournalRequest,
    CreatePayableJournalRequest,
    CreatePaymentJournalRequest,
    LedgerEntryResponse,
    LedgerTransactionResponse,
    LedgerEntryListResponse,
    LedgerEntryFilters,
    AccountBalanceSchema,
    TrialBalanceResponse
)

router = APIRouter(tags=["Ledger Entries"])


# ============================================================================
# LEDGER ENTRY ENDPOINTS
# ============================================================================

@router.get(
    "",
    response_model=LedgerEntryListResponse,
    summary="List ledger entries with optional filters"
)
def list_ledger_entries_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db),
    account_id: Optional[UUID] = Query(None, description="Filter by account ID"),
    tx_id: Optional[UUID] = Query(None, description="Filter by transaction ID"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    professional_id: Optional[UUID] = Query(None, description="Filter by professional ID"),
    event_id: Optional[UUID] = Query(None, description="Filter by payable/receivable ID"),
    payment_id: Optional[UUID] = Query(None, description="Filter by payment ID"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to"),
    debit_only: Optional[bool] = Query(False, description="Show only debit entries"),
    credit_only: Optional[bool] = Query(False, description="Show only credit entries"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of items to return")
):
    """
    List ledger entries with optional filtering.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view ledger entries."
        )
    
    service = create_ledger_entry_service(db, requesting_user)
    
    filters = LedgerEntryFilters(
        account_id=account_id,
        tx_id=tx_id,
        currency=currency,
        professional_id=professional_id,
        event_id=event_id,
        payment_id=payment_id,
        date_from=date_from,
        date_to=date_to,
        debit_only=debit_only,
        credit_only=credit_only
    )
    
    entries, total_count = service.list_entries(filters, skip, limit)
    
    # Calculate summary totals
    total_debits = sum(entry.debit_amount for entry in entries)
    total_credits = sum(entry.credit_amount for entry in entries)
    
    return LedgerEntryListResponse(
        entries=entries,
        total_count=total_count,
        total_debits=total_debits,
        total_credits=total_credits
    )


@router.get(
    "/{entry_id}",
    response_model=LedgerEntrySchema,
    summary="Get ledger entry by ID"
)
def get_ledger_entry_endpoint(
    entry_id: int = Path(..., description="Ledger entry ID"),
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get a specific ledger entry by ID.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view ledger entries."
        )
    
    service = create_ledger_entry_service(db, requesting_user)
    entry = service.get_by_id(entry_id)
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ledger entry not found"
        )
    
    return entry


@router.get(
    "/transactions/{tx_id}",
    response_model=LedgerTransactionSchema,
    summary="Get complete transaction by transaction ID"
)
def get_transaction_endpoint(
    tx_id: UUID = Path(..., description="Transaction ID"),
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get all ledger entries for a complete transaction.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view transactions."
        )
    
    service = create_ledger_entry_service(db, requesting_user)
    entries = service.get_transaction(tx_id)
    
    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Calculate transaction summary
    total_amount = sum(entry.debit_amount for entry in entries)
    
    return LedgerTransactionSchema(
        tx_id=tx_id,
        entries=entries,
        currency=entries[0].currency,
        total_amount=total_amount,
        created_at=entries[0].created_at,
        created_by=entries[0].created_by
    )


# ============================================================================
# TRANSACTION CREATION ENDPOINTS
# ============================================================================

@router.post(
    "/entries",
    response_model=LedgerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a single ledger entry"
)
def create_ledger_entry_endpoint(
    entry_data: CreateLedgerEntryRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a single ledger entry.
    
    Only managers (GESTOR) can create ledger entries.
    Note: For proper double-entry bookkeeping, use transaction endpoints instead.
    """
    try:
        service = create_ledger_entry_service(db, requesting_user)
        entry = service.create_entry(entry_data)
        
        return LedgerEntryResponse(
            entry=entry,
            message="Ledger entry created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ledger entry: {str(e)}"
        )


@router.post(
    "/transactions",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a complete double-entry transaction"
)
def create_transaction_endpoint(
    transaction_data: CreateLedgerTransactionRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a complete double-entry transaction with multiple entries.
    
    Only managers (GESTOR) can create transactions.
    """
    try:
        service = create_ledger_entry_service(db, requesting_user)
        entries = service.create_transaction(transaction_data)
        
        # Build response
        tx_id = entries[0].tx_id
        total_amount = sum(entry.debit_amount for entry in entries)
        
        transaction = LedgerTransactionSchema(
            tx_id=tx_id,
            entries=entries,
            currency=entries[0].currency,
            total_amount=total_amount,
            created_at=entries[0].created_at,
            created_by=entries[0].created_by
        )
        
        return LedgerTransactionResponse(
            transaction=transaction,
            message="Transaction created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transaction: {str(e)}"
        )


# ============================================================================
# JOURNAL ENTRY ENDPOINTS (High-level business operations)
# ============================================================================

@router.post(
    "/journals/receivable",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create receivable journal entry"
)
def create_receivable_journal_endpoint(
    journal_data: CreateReceivableJournalRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a receivable journal entry (Dr. Customer, Cr. Revenue).
    
    Only managers (GESTOR) can create journal entries.
    """
    try:
        service = create_ledger_entry_service(db, requesting_user)
        entries = service.create_receivable_journal(journal_data)
        
        # Build response
        tx_id = entries[0].tx_id
        total_amount = sum(entry.debit_amount for entry in entries)
        
        transaction = LedgerTransactionSchema(
            tx_id=tx_id,
            entries=entries,
            currency=entries[0].currency,
            total_amount=total_amount,
            created_at=entries[0].created_at,
            created_by=entries[0].created_by
        )
        
        return LedgerTransactionResponse(
            transaction=transaction,
            message="Receivable journal entry created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create receivable journal entry: {str(e)}"
        )


@router.post(
    "/journals/payable",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create payable journal entry"
)
def create_payable_journal_endpoint(
    journal_data: CreatePayableJournalRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a payable journal entry (Dr. Expense, Cr. Supplier).
    
    Only managers (GESTOR) can create journal entries.
    """
    try:
        service = create_ledger_entry_service(db, requesting_user)
        entries = service.create_payable_journal(journal_data)
        
        # Build response
        tx_id = entries[0].tx_id
        total_amount = sum(entry.debit_amount for entry in entries)
        
        transaction = LedgerTransactionSchema(
            tx_id=tx_id,
            entries=entries,
            currency=entries[0].currency,
            total_amount=total_amount,
            created_at=entries[0].created_at,
            created_by=entries[0].created_by
        )
        
        return LedgerTransactionResponse(
            transaction=transaction,
            message="Payable journal entry created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payable journal entry: {str(e)}"
        )


@router.post(
    "/journals/payment",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create payment journal entry"
)
def create_payment_journal_endpoint(
    journal_data: CreatePaymentJournalRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a payment journal entry (Dr. Cash, Cr. Receivable or Dr. Payable, Cr. Cash).
    
    Only managers (GESTOR) can create journal entries.
    """
    try:
        service = create_ledger_entry_service(db, requesting_user)
        entries = service.create_payment_journal(journal_data)
        
        # Build response
        tx_id = entries[0].tx_id
        total_amount = sum(entry.debit_amount for entry in entries)
        
        transaction = LedgerTransactionSchema(
            tx_id=tx_id,
            entries=entries,
            currency=entries[0].currency,
            total_amount=total_amount,
            created_at=entries[0].created_at,
            created_by=entries[0].created_by
        )
        
        return LedgerTransactionResponse(
            transaction=transaction,
            message="Payment journal entry created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment journal entry: {str(e)}"
        )


# ============================================================================
# REPORTING ENDPOINTS
# ============================================================================

@router.get(
    "/accounts/{account_id}/balance",
    response_model=AccountBalanceSchema,
    summary="Get account balance"
)
def get_account_balance_endpoint(
    account_id: UUID = Path(..., description="Account ID"),
    as_of_date: Optional[datetime] = Query(None, description="Balance as of date (optional)"),
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get account balance information.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view account balances."
        )
    
    service = create_ledger_entry_service(db, requesting_user)
    
    try:
        balance = service.get_account_balance(account_id, as_of_date)
        return balance
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get account balance: {str(e)}"
        )


@router.get(
    "/reports/trial-balance",
    response_model=TrialBalanceResponse,
    summary="Get trial balance report"
)
def get_trial_balance_endpoint(
    as_of_date: Optional[datetime] = Query(None, description="Trial balance as of date (optional)"),
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Get trial balance report for all accounts.
    
    Only managers (GESTOR) can access this endpoint.
    """
    service = create_ledger_entry_service(db, requesting_user)
    
    try:
        trial_balance = service.get_trial_balance(as_of_date)
        return trial_balance
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trial balance: {str(e)}"
        )