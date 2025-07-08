"""
Payment Routes
RESTful API endpoints for payment operations.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.models import User
from Core.Auth.constants import UserRole

from .services import create_payment_service
from .schemas import (
    PaymentSchema, 
    PaymentListResponse, 
    PaymentResponse,
    CreatePaymentRequest
)

router = APIRouter(tags=["Payments"])


@router.get(
    "",
    response_model=PaymentListResponse,
    summary="List payments with optional filters"
)
def list_payments_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db),
    client_id: Optional[UUID] = Query(None, description="Filter by client ID"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return")
):
    """
    List payments with optional filtering.
    
    - **client_id**: Optional client ID filter
    - **skip**: Number of items to skip for pagination
    - **limit**: Number of items to return
    """
    # Only ATENDENTE and GESTOR can view all payments
    # CLIENTE can only view their own payments
    if requesting_user.role == UserRole.CLIENTE:
        client_id = requesting_user.id  # Force client to see only their payments
    elif requesting_user.role not in [UserRole.ATENDENTE, UserRole.GESTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only reception staff, managers, and clients can view payments."
        )
    
    payment_service = create_payment_service(db)
    
    if client_id:
        payments = payment_service.get_payments_by_client(client_id)
        # Apply pagination manually for client filter
        total_count = len(payments)
        payments = payments[skip:skip + limit]
    else:
        # For now, return empty list for "all payments" - would need to implement in service
        payments = []
        total_count = 0
    
    return PaymentListResponse(
        payments=payments,
        total_count=total_count
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentSchema,
    summary="Get payment by ID"
)
def get_payment_endpoint(
    payment_id: UUID = Path(..., description="Payment ID"),
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get a specific payment by ID.
    
    - **payment_id**: UUID of the payment record
    """
    payment_service = create_payment_service(db)
    payment = payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Permission check: clients can only see their own payments
    if requesting_user.role == UserRole.CLIENTE and payment.client_id != requesting_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own payments."
        )
    elif requesting_user.role not in [UserRole.CLIENTE, UserRole.ATENDENTE, UserRole.GESTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only clients, reception staff, and managers can view payments."
        )
    
    return payment


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new payment record"
)
def create_payment_endpoint(
    payment_data: CreatePaymentRequest,
    requesting_user: User = Depends(require_role([UserRole.ATENDENTE, UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a new payment record.
    
    Only reception staff (ATENDENTE) and managers (GESTOR) can create payments.
    
    - **payment_data**: Payment details including amounts, method, and group IDs
    """
    try:
        payment_service = create_payment_service(db)
        
        payment = payment_service.create_payment_from_checkout(
            client_id=payment_data.client_id,
            group_ids=payment_data.group_ids,
            subtotal=payment_data.subtotal,
            discount_amount=payment_data.discount_amount,
            tip_amount=payment_data.tip_amount,
            total_amount=payment_data.total_amount,
            payment_method=payment_data.payment_method,
            account_id=payment_data.account_id,
            notes=payment_data.notes
        )
        
        db.commit()
        
        return PaymentResponse(
            payment=payment,
            message="Payment created successfully"
        )
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )