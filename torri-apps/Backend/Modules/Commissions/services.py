from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from Core.Database.dependencies import get_db
from Core.Auth.models import User
from Modules.Appointments.models import Appointment
from Modules.Services.models import Service
from .models import Commission, CommissionPayment, CommissionPaymentItem
from .schemas import (
    CommissionCreate, CommissionUpdate, CommissionResponse, 
    CommissionPaymentCreate, CommissionPaymentResponse,
    CommissionFilters, CommissionKPIs, CommissionExportRow
)
from .constants import CommissionPaymentStatus, CommissionPaymentMethod


class CommissionService:
    """Service class for commission management operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_commission_for_appointment(self, appointment_id: UUID) -> Optional[Commission]:
        """
        Creates a commission record for a completed appointment.
        Called automatically when appointment status changes to COMPLETED.
        
        Args:
            appointment_id: UUID of the completed appointment
            
        Returns:
            Commission object if created successfully, None if appointment not found or commission already exists
        """
        try:
            # Get appointment with related service and professional data
            appointment = self.db.query(Appointment)\
                .options(joinedload(Appointment.service))\
                .filter(Appointment.id == appointment_id)\
                .first()
            
            if not appointment:
                return None
                
            # Check if commission already exists
            existing_commission = self.db.query(Commission)\
                .filter(Commission.appointment_id == appointment_id)\
                .first()
            
            if existing_commission:
                return existing_commission
                
            # Get service to check commission percentage
            service = self.db.query(Service).filter(Service.id == appointment.service_id).first()
            if not service or service.commission_percentage is None:
                return None
                
            # Calculate commission value
            commission_value = self.calculate_commission_value(
                appointment.price_at_booking, 
                service.commission_percentage
            )
            
            # Create commission record
            commission = Commission(
                professional_id=appointment.professional_id,
                appointment_id=appointment_id,
                service_price=appointment.price_at_booking,
                commission_percentage=service.commission_percentage,
                calculated_value=commission_value,
                payment_status=CommissionPaymentStatus.PENDING
            )
            
            self.db.add(commission)
            self.db.commit()
            self.db.refresh(commission)
            
            return commission
            
        except IntegrityError:
            self.db.rollback()
            # Commission already exists, return existing one
            return self.db.query(Commission)\
                .filter(Commission.appointment_id == appointment_id)\
                .first()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def calculate_commission_value(self, service_price: Decimal, commission_percentage: Decimal) -> Decimal:
        """
        Calculates commission value based on service price and percentage.
        
        Args:
            service_price: Service price at booking time
            commission_percentage: Commission percentage (0-100)
            
        Returns:
            Calculated commission value
        """
        if service_price <= 0 or commission_percentage <= 0:
            return Decimal('0.00')
            
        commission_value = (service_price * commission_percentage) / Decimal('100')
        return commission_value.quantize(Decimal('0.01'))
    
    def get_commissions(self, filters: CommissionFilters) -> tuple[List[CommissionResponse], int]:
        """
        Retrieves commissions with filters and pagination.
        
        Args:
            filters: CommissionFilters object with query parameters
            
        Returns:
            Tuple of (commissions list, total count)
        """
        query = self.db.query(Commission)
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.payment_status:
            query = query.filter(Commission.payment_status == filters.payment_status)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        commissions = query.order_by(desc(Commission.created_at))\
            .offset(offset)\
            .limit(filters.page_size)\
            .all()
        
        # Convert to response format with additional data
        response_commissions = []
        for commission in commissions:
            commission_response = self._build_commission_response(commission)
            response_commissions.append(commission_response)
        
        return response_commissions, total_count
    
    def get_commission_by_id(self, commission_id: UUID) -> Optional[CommissionResponse]:
        """Get a specific commission by ID."""
        commission = self.db.query(Commission).filter(Commission.id == commission_id).first()
        if not commission:
            return None
        
        return self._build_commission_response(commission)
    
    def update_commission(self, commission_id: UUID, update_data: CommissionUpdate) -> Optional[CommissionResponse]:
        """
        Updates a commission with new values.
        
        Args:
            commission_id: UUID of commission to update
            update_data: CommissionUpdate object with new values
            
        Returns:
            Updated commission or None if not found
        """
        commission = self.db.query(Commission).filter(Commission.id == commission_id).first()
        if not commission:
            return None
        
        # Update fields
        if update_data.adjusted_value is not None:
            commission.adjusted_value = update_data.adjusted_value
            
        if update_data.adjustment_reason is not None:
            commission.adjustment_reason = update_data.adjustment_reason
            
        if update_data.payment_status is not None:
            commission.payment_status = update_data.payment_status
        
        commission.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(commission)
        
        return self._build_commission_response(commission)
    
    def get_commission_kpis(self, filters: CommissionFilters) -> CommissionKPIs:
        """
        Calculates KPIs for commission dashboard.
        
        Args:
            filters: Filters to apply (date range, professional, etc.)
            
        Returns:
            CommissionKPIs object with calculated metrics
        """
        query = self.db.query(Commission)
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        # Calculate metrics
        all_commissions = query.all()
        
        total_pending = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions 
            if c.payment_status == CommissionPaymentStatus.PENDING
        )
        
        total_paid = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions 
            if c.payment_status == CommissionPaymentStatus.PAID
        )
        
        total_this_period = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in all_commissions
        )
        
        pending_count = len([c for c in all_commissions if c.payment_status == CommissionPaymentStatus.PENDING])
        
        # Get last payment info
        last_payment = self.db.query(CommissionPayment)\
            .order_by(desc(CommissionPayment.payment_date))\
            .first()
        
        return CommissionKPIs(
            total_pending=Decimal(str(total_pending)),
            total_paid=Decimal(str(total_paid)),
            total_this_period=Decimal(str(total_this_period)),
            last_payment_date=last_payment.payment_date if last_payment else None,
            last_payment_amount=last_payment.total_amount if last_payment else None,
            commission_count=len(all_commissions),
            pending_count=pending_count
        )
    
    def process_commission_payment(self, payment_data: CommissionPaymentCreate) -> CommissionPaymentResponse:
        """
        Processes a batch payment for multiple commissions.
        
        Args:
            payment_data: CommissionPaymentCreate object with payment details
            
        Returns:
            CommissionPaymentResponse object
        """
        # Get commissions to pay
        commissions = self.db.query(Commission)\
            .filter(Commission.id.in_(payment_data.commission_ids))\
            .filter(Commission.professional_id == payment_data.professional_id)\
            .filter(Commission.payment_status == CommissionPaymentStatus.PENDING)\
            .all()
        
        if not commissions:
            raise ValueError("No pending commissions found for the specified professional")
        
        # Validate total amount
        expected_total = sum((c.adjusted_value or c.calculated_value) for c in commissions)
        if abs(payment_data.total_amount - expected_total) > Decimal('0.01'):
            raise ValueError(f"Total amount mismatch. Expected: {expected_total}, Got: {payment_data.total_amount}")
        
        # Create payment record
        payment = CommissionPayment(
            professional_id=payment_data.professional_id,
            total_amount=payment_data.total_amount,
            payment_method=payment_data.payment_method,
            payment_date=payment_data.payment_date,
            period_start=payment_data.period_start,
            period_end=payment_data.period_end,
            receipt_url=payment_data.receipt_url,
            notes=payment_data.notes
        )
        
        self.db.add(payment)
        self.db.flush()  # Get payment ID
        
        # Create payment items and update commission status
        for commission in commissions:
            payment_item = CommissionPaymentItem(
                payment_id=payment.id,
                commission_id=commission.id
            )
            self.db.add(payment_item)
            
            # Update commission status
            commission.payment_status = CommissionPaymentStatus.PAID
            commission.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return self._build_payment_response(payment)
    
    def get_commission_export_data(self, filters: CommissionFilters) -> List[CommissionExportRow]:
        """
        Gets commission data formatted for CSV export.
        
        Args:
            filters: Filters to apply
            
        Returns:
            List of CommissionExportRow objects
        """
        query = self.db.query(Commission)
        
        # Apply filters
        if filters.professional_id:
            query = query.filter(Commission.professional_id == filters.professional_id)
            
        if filters.payment_status:
            query = query.filter(Commission.payment_status == filters.payment_status)
            
        if filters.date_from:
            query = query.filter(Commission.created_at >= filters.date_from)
            
        if filters.date_to:
            query = query.filter(Commission.created_at <= filters.date_to)
        
        commissions = query.order_by(desc(Commission.created_at)).all()
        
        export_rows = []
        for commission in commissions:
            # Get related data
            professional = self.db.query(User).filter(User.id == commission.professional_id).first()
            appointment = self.db.query(Appointment).filter(Appointment.id == commission.appointment_id).first()
            service = self.db.query(Service).filter(Service.id == appointment.service_id).first() if appointment else None
            
            # Get payment date if paid
            payment_date = None
            if commission.payment_status == CommissionPaymentStatus.PAID:
                payment_item = self.db.query(CommissionPaymentItem)\
                    .filter(CommissionPaymentItem.commission_id == commission.id)\
                    .first()
                if payment_item:
                    payment = self.db.query(CommissionPayment)\
                        .filter(CommissionPayment.id == payment_item.payment_id)\
                        .first()
                    payment_date = payment.payment_date if payment else None
            
            export_row = CommissionExportRow(
                professional_name=professional.full_name or professional.email if professional else 'Unknown',
                appointment_date=appointment.appointment_date if appointment else date.today(),
                service_name=service.name if service else 'Unknown',
                service_price=commission.service_price,
                commission_percentage=commission.commission_percentage,
                calculated_value=commission.calculated_value,
                adjusted_value=commission.adjusted_value,
                final_value=commission.adjusted_value or commission.calculated_value,
                payment_status=commission.payment_status.value,
                payment_date=payment_date,
                created_at=commission.created_at
            )
            export_rows.append(export_row)
        
        return export_rows
    
    def _build_commission_response(self, commission: Commission) -> CommissionResponse:
        """Builds a CommissionResponse with additional data."""
        # Get related data
        professional = self.db.query(User).filter(User.id == commission.professional_id).first()
        appointment = self.db.query(Appointment).filter(Appointment.id == commission.appointment_id).first()
        service = self.db.query(Service).filter(Service.id == appointment.service_id).first() if appointment else None
        
        return CommissionResponse(
            id=commission.id,
            professional_id=commission.professional_id,
            appointment_id=commission.appointment_id,
            service_price=commission.service_price,
            commission_percentage=commission.commission_percentage,
            calculated_value=commission.calculated_value,
            adjusted_value=commission.adjusted_value,
            adjustment_reason=commission.adjustment_reason,
            payment_status=commission.payment_status,
            created_at=commission.created_at,
            updated_at=commission.updated_at,
            professional_name=professional.full_name or professional.email if professional else None,
            service_name=service.name if service else None,
            appointment_date=appointment.appointment_date if appointment else None,
            final_value=commission.adjusted_value or commission.calculated_value
        )
    
    def _build_payment_response(self, payment: CommissionPayment) -> CommissionPaymentResponse:
        """Builds a CommissionPaymentResponse with additional data."""
        professional = self.db.query(User).filter(User.id == payment.professional_id).first()
        commission_count = len(payment.payment_items)
        
        return CommissionPaymentResponse(
            id=payment.id,
            professional_id=payment.professional_id,
            total_amount=payment.total_amount,
            payment_method=payment.payment_method,
            payment_date=payment.payment_date,
            period_start=payment.period_start,
            period_end=payment.period_end,
            receipt_url=payment.receipt_url,
            notes=payment.notes,
            created_at=payment.created_at,
            professional_name=professional.full_name or professional.email if professional else None,
            commission_count=commission_count
        )