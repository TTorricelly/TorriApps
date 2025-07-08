"""
PayablesReceivables Service
Handles business logic for payables and receivables following Domain Driven Design principles.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from fastapi import HTTPException, status

from .models import PayableReceivable, PayableReceivableInstallment, Direction, PayableReceivableStatus, ReferenceType, InstallmentStatus
from .schemas import (
    CreatePayableReceivableRequest, 
    UpdatePayableReceivableRequest,
    ApplyPaymentRequest,
    PayableReceivableFilters,
    CashflowSummaryResponse,
    CreateInstallmentRequest,
    CreateInstallmentPlanRequest,
    ApplyInstallmentPaymentRequest
)


class PayablesReceivablesService:
    """
    Domain service for payables and receivables operations.
    Follows Single Responsibility Principle - only handles payables/receivables operations.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_payable_receivable(
        self, 
        data: CreatePayableReceivableRequest
    ) -> PayableReceivable:
        """
        Create a new payable or receivable record.
        
        Args:
            data: Payable/receivable creation data
            
        Returns:
            Created PayableReceivable record
            
        Raises:
            HTTPException: If validation fails or creation error occurs
        """
        # Validate reference exists (basic check - could be enhanced with actual FK validation)
        if not data.reference_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference ID is required"
            )
        
        # Create the record
        payable_receivable = PayableReceivable(
            direction=data.direction,
            due_date=data.due_date,
            original_amount=data.original_amount,
            open_amount=data.original_amount,  # Initially, open amount equals original amount
            counterparty=data.counterparty,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            description=data.description,
            notes=data.notes,
            status=PayableReceivableStatus.OPEN
        )
        
        self.db.add(payable_receivable)
        self.db.commit()
        self.db.refresh(payable_receivable)
        
        return payable_receivable
    
    def get_by_id(self, payable_receivable_id: UUID) -> Optional[PayableReceivable]:
        """
        Get payable/receivable by ID.
        
        Args:
            payable_receivable_id: ID of the record
            
        Returns:
            PayableReceivable record or None if not found
        """
        return self.db.query(PayableReceivable).filter(
            PayableReceivable.id == payable_receivable_id
        ).first()
    
    def update_payable_receivable(
        self, 
        payable_receivable_id: UUID, 
        data: UpdatePayableReceivableRequest
    ) -> PayableReceivable:
        """
        Update a payable/receivable record.
        
        Args:
            payable_receivable_id: ID of the record to update
            data: Update data
            
        Returns:
            Updated PayableReceivable record
            
        Raises:
            HTTPException: If record not found or update fails
        """
        payable_receivable = self.get_by_id(payable_receivable_id)
        
        if not payable_receivable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payable/Receivable not found"
            )
        
        # Only allow updates if not fully paid or cancelled
        if payable_receivable.status in [PayableReceivableStatus.PAID, PayableReceivableStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update paid or cancelled payable/receivable"
            )
        
        # Update fields
        if data.due_date is not None:
            payable_receivable.due_date = data.due_date
        if data.counterparty is not None:
            payable_receivable.counterparty = data.counterparty
        if data.description is not None:
            payable_receivable.description = data.description
        if data.notes is not None:
            payable_receivable.notes = data.notes
        
        self.db.commit()
        self.db.refresh(payable_receivable)
        
        return payable_receivable
    
    def apply_payment(
        self, 
        payable_receivable_id: UUID, 
        payment_data: ApplyPaymentRequest
    ) -> PayableReceivable:
        """
        Apply a payment to a payable/receivable.
        
        Args:
            payable_receivable_id: ID of the record
            payment_data: Payment information
            
        Returns:
            Updated PayableReceivable record
            
        Raises:
            HTTPException: If record not found or payment fails
        """
        payable_receivable = self.get_by_id(payable_receivable_id)
        
        if not payable_receivable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payable/Receivable not found"
            )
        
        # Cannot apply payment to cancelled items
        if payable_receivable.status == PayableReceivableStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply payment to cancelled payable/receivable"
            )
        
        # Cannot apply payment to already paid items
        if payable_receivable.status == PayableReceivableStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payable/Receivable is already fully paid"
            )
        
        try:
            # Apply the payment using the domain method
            payable_receivable.apply_payment(float(payment_data.payment_amount))
            
            # Add payment notes if provided
            if payment_data.payment_notes:
                current_notes = payable_receivable.notes or ""
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
                payment_note = f"[{timestamp}] Payment: {payment_data.payment_amount} - {payment_data.payment_notes}"
                payable_receivable.notes = f"{current_notes}\n{payment_note}".strip()
            
            self.db.commit()
            self.db.refresh(payable_receivable)
            
            return payable_receivable
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    def cancel_payable_receivable(self, payable_receivable_id: UUID) -> PayableReceivable:
        """
        Cancel a payable/receivable.
        
        Args:
            payable_receivable_id: ID of the record to cancel
            
        Returns:
            Updated PayableReceivable record
            
        Raises:
            HTTPException: If record not found or already paid
        """
        payable_receivable = self.get_by_id(payable_receivable_id)
        
        if not payable_receivable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payable/Receivable not found"
            )
        
        if payable_receivable.status == PayableReceivableStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a paid payable/receivable"
            )
        
        payable_receivable.mark_as_cancelled()
        self.db.commit()
        self.db.refresh(payable_receivable)
        
        return payable_receivable
    
    def list_payables_receivables(
        self, 
        filters: PayableReceivableFilters,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[PayableReceivable], int]:
        """
        List payables/receivables with filtering and pagination.
        
        Args:
            filters: Filter criteria
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Tuple of (records, total_count)
        """
        query = self.db.query(PayableReceivable)
        
        # Apply filters
        if filters.direction:
            query = query.filter(PayableReceivable.direction == filters.direction)
        
        if filters.status:
            query = query.filter(PayableReceivable.status == filters.status)
        
        if filters.reference_type:
            query = query.filter(PayableReceivable.reference_type == filters.reference_type)
        
        if filters.counterparty:
            query = query.filter(PayableReceivable.counterparty.ilike(f"%{filters.counterparty}%"))
        
        if filters.due_date_from:
            query = query.filter(PayableReceivable.due_date >= filters.due_date_from)
        
        if filters.due_date_to:
            query = query.filter(PayableReceivable.due_date <= filters.due_date_to)
        
        if filters.overdue_only:
            today = date.today()
            query = query.filter(
                and_(
                    PayableReceivable.due_date < today,
                    PayableReceivable.status.in_([PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL])
                )
            )
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        records = query.order_by(desc(PayableReceivable.due_date)).offset(skip).limit(limit).all()
        
        return records, total_count
    
    def get_cashflow_summary(self) -> CashflowSummaryResponse:
        """
        Get cashflow summary with totals and overdue information.
        
        Returns:
            Cashflow summary data
        """
        today = date.today()
        
        # Total open receivables
        total_receivables = self.db.query(PayableReceivable).filter(
            and_(
                PayableReceivable.direction == Direction.RECEIVABLE,
                PayableReceivable.status.in_([PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL])
            )
        ).with_entities(PayableReceivable.open_amount).all()
        
        total_receivables_amount = sum(Decimal(str(item[0])) for item in total_receivables)
        
        # Total open payables
        total_payables = self.db.query(PayableReceivable).filter(
            and_(
                PayableReceivable.direction == Direction.PAYABLE,
                PayableReceivable.status.in_([PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL])
            )
        ).with_entities(PayableReceivable.open_amount).all()
        
        total_payables_amount = sum(Decimal(str(item[0])) for item in total_payables)
        
        # Overdue receivables
        overdue_receivables = self.db.query(PayableReceivable).filter(
            and_(
                PayableReceivable.direction == Direction.RECEIVABLE,
                PayableReceivable.due_date < today,
                PayableReceivable.status.in_([PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL])
            )
        ).with_entities(PayableReceivable.open_amount).all()
        
        overdue_receivables_amount = sum(Decimal(str(item[0])) for item in overdue_receivables)
        overdue_receivables_count = len(overdue_receivables)
        
        # Overdue payables
        overdue_payables = self.db.query(PayableReceivable).filter(
            and_(
                PayableReceivable.direction == Direction.PAYABLE,
                PayableReceivable.due_date < today,
                PayableReceivable.status.in_([PayableReceivableStatus.OPEN, PayableReceivableStatus.PARTIAL])
            )
        ).with_entities(PayableReceivable.open_amount).all()
        
        overdue_payables_amount = sum(Decimal(str(item[0])) for item in overdue_payables)
        overdue_payables_count = len(overdue_payables)
        
        return CashflowSummaryResponse(
            total_receivables=total_receivables_amount,
            total_payables=total_payables_amount,
            net_cashflow=total_receivables_amount - total_payables_amount,
            overdue_receivables=overdue_receivables_amount,
            overdue_payables=overdue_payables_amount,
            overdue_receivables_count=overdue_receivables_count,
            overdue_payables_count=overdue_payables_count
        )
    
    # ============================================================================
    # INSTALLMENT METHODS
    # ============================================================================
    
    def create_installment(
        self, 
        payable_receivable_id: UUID, 
        data: CreateInstallmentRequest
    ) -> PayableReceivableInstallment:
        """
        Create a single installment for a payable/receivable.
        
        Args:
            payable_receivable_id: ID of the parent payable/receivable
            data: Installment creation data
            
        Returns:
            Created PayableReceivableInstallment record
            
        Raises:
            HTTPException: If parent not found or validation fails
        """
        # Verify parent exists
        parent = self.get_by_id(payable_receivable_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payable/Receivable not found"
            )
        
        # Check if installment number already exists
        existing = self.db.query(PayableReceivableInstallment).filter(
            and_(
                PayableReceivableInstallment.pr_id == payable_receivable_id,
                PayableReceivableInstallment.installment_number == data.installment_number
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Installment number {data.installment_number} already exists"
            )
        
        # Create installment
        installment = PayableReceivableInstallment(
            pr_id=payable_receivable_id,
            installment_number=data.installment_number,
            due_date=data.due_date,
            original_amount=data.amount,
            open_amount=data.amount,
            status=InstallmentStatus.OPEN
        )
        
        self.db.add(installment)
        self.db.commit()
        self.db.refresh(installment)
        
        return installment
    
    def create_installment_plan(
        self, 
        payable_receivable_id: UUID, 
        data: CreateInstallmentPlanRequest
    ) -> List[PayableReceivableInstallment]:
        """
        Create multiple installments at once for a payable/receivable.
        
        Args:
            payable_receivable_id: ID of the parent payable/receivable
            data: Installment plan data
            
        Returns:
            List of created PayableReceivableInstallment records
            
        Raises:
            HTTPException: If parent not found or validation fails
        """
        from datetime import timedelta
        
        # Verify parent exists
        parent = self.get_by_id(payable_receivable_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payable/Receivable not found"
            )
        
        # Check if any installments already exist
        existing_count = self.db.query(PayableReceivableInstallment).filter(
            PayableReceivableInstallment.pr_id == payable_receivable_id
        ).count()
        
        if existing_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Installments already exist for this payable/receivable"
            )
        
        # Calculate amount per installment
        amount_per_installment = parent.original_amount / data.number_of_installments
        
        # Create installments
        installments = []
        current_due_date = data.first_due_date
        
        for i in range(data.number_of_installments):
            installment = PayableReceivableInstallment(
                pr_id=payable_receivable_id,
                installment_number=i + 1,
                due_date=current_due_date,
                original_amount=amount_per_installment,
                open_amount=amount_per_installment,
                status=InstallmentStatus.OPEN
            )
            
            installments.append(installment)
            self.db.add(installment)
            
            # Calculate next due date
            current_due_date = current_due_date + timedelta(days=data.interval_days)
        
        self.db.commit()
        
        # Refresh all installments
        for installment in installments:
            self.db.refresh(installment)
        
        return installments
    
    def get_installments_by_payable_receivable(
        self, 
        payable_receivable_id: UUID
    ) -> List[PayableReceivableInstallment]:
        """
        Get all installments for a specific payable/receivable.
        
        Args:
            payable_receivable_id: ID of the parent payable/receivable
            
        Returns:
            List of PayableReceivableInstallment records
        """
        return self.db.query(PayableReceivableInstallment).filter(
            PayableReceivableInstallment.pr_id == payable_receivable_id
        ).order_by(PayableReceivableInstallment.installment_number).all()
    
    def get_installment_by_id(self, installment_id: UUID) -> Optional[PayableReceivableInstallment]:
        """
        Get installment by ID.
        
        Args:
            installment_id: ID of the installment
            
        Returns:
            PayableReceivableInstallment record or None if not found
        """
        return self.db.query(PayableReceivableInstallment).filter(
            PayableReceivableInstallment.id == installment_id
        ).first()
    
    def apply_installment_payment(
        self, 
        installment_id: UUID, 
        payment_data: ApplyInstallmentPaymentRequest
    ) -> PayableReceivableInstallment:
        """
        Apply a payment to a specific installment.
        
        Args:
            installment_id: ID of the installment
            payment_data: Payment information
            
        Returns:
            Updated PayableReceivableInstallment record
            
        Raises:
            HTTPException: If installment not found or payment fails
        """
        installment = self.get_installment_by_id(installment_id)
        
        if not installment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Installment not found"
            )
        
        # Cannot apply payment to cancelled installments
        if installment.status == InstallmentStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply payment to cancelled installment"
            )
        
        # Cannot apply payment to already paid installments
        if installment.status == InstallmentStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Installment is already fully paid"
            )
        
        try:
            # Apply the payment using the domain method
            installment.apply_payment(
                float(payment_data.payment_amount), 
                payment_data.payment_notes
            )
            
            self.db.commit()
            self.db.refresh(installment)
            
            # Update parent payable/receivable status if needed
            self._update_parent_status_from_installments(installment.pr_id)
            
            return installment
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    def cancel_installment(self, installment_id: UUID) -> PayableReceivableInstallment:
        """
        Cancel a specific installment.
        
        Args:
            installment_id: ID of the installment to cancel
            
        Returns:
            Updated PayableReceivableInstallment record
            
        Raises:
            HTTPException: If installment not found or already paid
        """
        installment = self.get_installment_by_id(installment_id)
        
        if not installment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Installment not found"
            )
        
        if installment.status == InstallmentStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a paid installment"
            )
        
        installment.mark_as_cancelled()
        self.db.commit()
        self.db.refresh(installment)
        
        # Update parent payable/receivable status if needed
        self._update_parent_status_from_installments(installment.pr_id)
        
        return installment
    
    def _update_parent_status_from_installments(self, payable_receivable_id: UUID):
        """
        Update the parent payable/receivable status based on installment statuses.
        
        Args:
            payable_receivable_id: ID of the parent payable/receivable
        """
        parent = self.get_by_id(payable_receivable_id)
        if not parent:
            return
        
        installments = self.get_installments_by_payable_receivable(payable_receivable_id)
        if not installments:
            return
        
        # Calculate totals from installments
        total_paid = sum(installment.paid_amount for installment in installments)
        total_original = sum(float(installment.original_amount) for installment in installments)
        
        # Update parent open amount and status
        parent.open_amount = Decimal(str(total_original - total_paid))
        
        if parent.open_amount == 0:
            parent.status = PayableReceivableStatus.PAID
        elif parent.open_amount < parent.original_amount:
            parent.status = PayableReceivableStatus.PARTIAL
        else:
            parent.status = PayableReceivableStatus.OPEN
        
        self.db.commit()


class PayablesReceivablesFactory:
    """
    Factory class for creating PayablesReceivablesService instances.
    Follows Dependency Injection principles.
    """
    
    @staticmethod
    def create_service(db: Session) -> PayablesReceivablesService:
        """
        Create a PayablesReceivablesService instance.
        
        Args:
            db: Database session
            
        Returns:
            PayablesReceivablesService instance
        """
        return PayablesReceivablesService(db)


# For backward compatibility and ease of use
def create_payables_receivables_service(db: Session) -> PayablesReceivablesService:
    """
    Factory function to create PayablesReceivablesService.
    
    Args:
        db: Database session
        
    Returns:
        PayablesReceivablesService instance
    """
    return PayablesReceivablesFactory.create_service(db)