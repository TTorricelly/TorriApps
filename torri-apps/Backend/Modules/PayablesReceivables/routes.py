"""
PayablesReceivables Routes
RESTful API endpoints for payables and receivables operations.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.models import User
from Core.Auth.constants import UserRole

from .services import create_payables_receivables_service
from .schemas import (
    PayableReceivableSchema,
    PayableReceivableListResponse,
    PayableReceivableResponse,
    CreatePayableReceivableRequest,
    UpdatePayableReceivableRequest,
    ApplyPaymentRequest,
    PayableReceivableFilters,
    CashflowSummaryResponse,
    Direction,
    PayableReceivableStatus,
    ReferenceType
)

router = APIRouter(tags=["Payables & Receivables"])


@router.get(
    "",
    response_model=PayableReceivableListResponse,
    summary="List payables and receivables with optional filters"
)
def list_payables_receivables_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db),
    direction: Optional[Direction] = Query(None, description="Filter by direction (RECEIVABLE/PAYABLE)"),
    status: Optional[PayableReceivableStatus] = Query(None, description="Filter by status"),
    reference_type: Optional[ReferenceType] = Query(None, description="Filter by reference type"),
    counterparty: Optional[str] = Query(None, description="Filter by counterparty (partial match)"),
    overdue_only: Optional[bool] = Query(False, description="Show only overdue items"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return")
):
    """
    List payables and receivables with optional filtering.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view payables/receivables."
        )
    
    service = create_payables_receivables_service(db)
    
    filters = PayableReceivableFilters(
        direction=direction,
        status=status,
        reference_type=reference_type,
        counterparty=counterparty,
        overdue_only=overdue_only
    )
    
    items, total_count = service.list_payables_receivables(filters, skip, limit)
    
    # Calculate summary totals for the response
    total_receivables_amount = sum(
        item.open_amount for item in items 
        if item.direction == Direction.RECEIVABLE and item.status in [PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL]
    )
    
    total_payables_amount = sum(
        item.open_amount for item in items 
        if item.direction == Direction.PAYABLE and item.status in [PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL]
    )
    
    overdue_count = sum(1 for item in items if item.is_overdue)
    
    return PayableReceivableListResponse(
        items=items,
        total_count=total_count,
        total_receivables_amount=total_receivables_amount,
        total_payables_amount=total_payables_amount,
        overdue_count=overdue_count
    )


@router.get(
    "/summary",
    response_model=CashflowSummaryResponse,
    summary="Get cashflow summary"
)
def get_cashflow_summary_endpoint(
    requesting_user: User = Depends(require_role([UserRole.GESTOR, UserRole.ATENDENTE])),
    db: Session = Depends(get_db)
):
    """
    Get cashflow summary with totals and overdue information.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    service = create_payables_receivables_service(db)
    return service.get_cashflow_summary()


@router.get(
    "/{payable_receivable_id}",
    response_model=PayableReceivableSchema,
    summary="Get payable/receivable by ID"
)
def get_payable_receivable_endpoint(
    payable_receivable_id: UUID = Path(..., description="Payable/Receivable ID"),
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get a specific payable/receivable by ID.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view payables/receivables."
        )
    
    service = create_payables_receivables_service(db)
    payable_receivable = service.get_by_id(payable_receivable_id)
    
    if not payable_receivable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payable/Receivable not found"
        )
    
    return payable_receivable


@router.post(
    "",
    response_model=PayableReceivableResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new payable or receivable"
)
def create_payable_receivable_endpoint(
    data: CreatePayableReceivableRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR, UserRole.ATENDENTE])),
    db: Session = Depends(get_db)
):
    """
    Create a new payable or receivable record.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can create payables/receivables.
    """
    try:
        service = create_payables_receivables_service(db)
        payable_receivable = service.create_payable_receivable(data)
        
        return PayableReceivableResponse(
            payable_receivable=payable_receivable,
            message="Payable/Receivable created successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payable/receivable"
        )


@router.put(
    "/{payable_receivable_id}",
    response_model=PayableReceivableResponse,
    summary="Update a payable/receivable"
)
def update_payable_receivable_endpoint(
    payable_receivable_id: UUID = Path(..., description="Payable/Receivable ID"),
    data: UpdatePayableReceivableRequest = ...,
    requesting_user: User = Depends(require_role([UserRole.GESTOR, UserRole.ATENDENTE])),
    db: Session = Depends(get_db)
):
    """
    Update a payable/receivable record.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can update payables/receivables.
    """
    try:
        service = create_payables_receivables_service(db)
        payable_receivable = service.update_payable_receivable(payable_receivable_id, data)
        
        return PayableReceivableResponse(
            payable_receivable=payable_receivable,
            message="Payable/Receivable updated successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update payable/receivable"
        )


@router.post(
    "/{payable_receivable_id}/payment",
    response_model=PayableReceivableResponse,
    summary="Apply payment to a payable/receivable"
)
def apply_payment_endpoint(
    payable_receivable_id: UUID = Path(..., description="Payable/Receivable ID"),
    payment_data: ApplyPaymentRequest = ...,
    requesting_user: User = Depends(require_role([UserRole.GESTOR, UserRole.ATENDENTE])),
    db: Session = Depends(get_db)
):
    """
    Apply a payment to a payable/receivable.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can apply payments.
    """
    try:
        service = create_payables_receivables_service(db)
        payable_receivable = service.apply_payment(payable_receivable_id, payment_data)
        
        return PayableReceivableResponse(
            payable_receivable=payable_receivable,
            message="Payment applied successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply payment"
        )


@router.delete(
    "/{payable_receivable_id}",
    response_model=PayableReceivableResponse,
    summary="Cancel a payable/receivable"
)
def cancel_payable_receivable_endpoint(
    payable_receivable_id: UUID = Path(..., description="Payable/Receivable ID"),
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),  # Only managers can cancel
    db: Session = Depends(get_db)
):
    """
    Cancel a payable/receivable.
    
    Only managers (GESTOR) can cancel payables/receivables.
    """
    try:
        service = create_payables_receivables_service(db)
        payable_receivable = service.cancel_payable_receivable(payable_receivable_id)
        
        return PayableReceivableResponse(
            payable_receivable=payable_receivable,
            message="Payable/Receivable cancelled successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel payable/receivable"
        )