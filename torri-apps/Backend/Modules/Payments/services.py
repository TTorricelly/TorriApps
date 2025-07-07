"""
Payment Service
Handles payment processing operations following Domain Driven Design principles.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session

from .models import Payment, PaymentItem, PaymentMethod, PaymentStatus, ItemType
from ..Appointments.models import AppointmentGroup, Appointment


class PaymentService:
    """
    Domain service for payment operations.
    Follows Single Responsibility Principle - only handles payment-related operations.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_payment_from_checkout(
        self,
        client_id: UUID,
        group_ids: List[UUID],
        subtotal: Decimal,
        discount_amount: Decimal,
        tip_amount: Decimal,
        total_amount: Decimal,
        payment_method: str,
        notes: Optional[str] = None
    ) -> Payment:
        """
        Create a payment record from checkout data.
        
        Args:
            client_id: ID of the client making the payment
            group_ids: List of appointment group IDs being paid for
            subtotal: Subtotal amount before discounts and tips
            discount_amount: Discount amount applied
            tip_amount: Tip amount added
            total_amount: Final total amount
            payment_method: Payment method (cash, debit, credit, pix)
            notes: Optional payment notes
            
        Returns:
            Created Payment record
            
        Raises:
            ValueError: If appointment groups are not found or validation fails
        """
        # Validate appointment groups exist
        groups = self.db.query(AppointmentGroup).filter(
            AppointmentGroup.id.in_(group_ids)
        ).all()
        
        if not groups:
            raise ValueError("No valid appointment groups found for payment")
        
        if len(groups) != len(group_ids):
            raise ValueError("Some appointment groups were not found")
        
        # Validate client ID (get from first group)
        if not client_id:
            client_id = groups[0].client_id
        
        # Validate payment method
        try:
            # Handle both lowercase and uppercase payment methods
            payment_method_lower = payment_method.lower()
            payment_method_enum = PaymentMethod(payment_method_lower)
        except ValueError:
            valid_methods = [method.value for method in PaymentMethod]
            raise ValueError(f"Invalid payment method: {payment_method}. Valid methods: {valid_methods}")
        
        # Generate unique payment ID
        payment_id = f"pay_{int(datetime.now().timestamp())}_{len(group_ids)}"
        
        # Create payment record
        payment = Payment(
            payment_id=payment_id,
            client_id=client_id,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tip_amount=tip_amount,
            total_amount=total_amount,
            payment_method=payment_method_enum,
            payment_status=PaymentStatus.COMPLETED,
            notes=notes
        )
        
        self.db.add(payment)
        self.db.flush()  # Get the payment ID for items
        
        # Create payment items for each appointment in the groups
        self._create_payment_items_for_groups(payment.id, groups)
        
        return payment
    
    def _create_payment_items_for_groups(
        self, 
        payment_id: UUID, 
        groups: List[AppointmentGroup]
    ) -> List[PaymentItem]:
        """
        Create payment items for all appointments in the given groups.
        
        Args:
            payment_id: ID of the payment record
            groups: List of appointment groups
            
        Returns:
            List of created PaymentItem records
        """
        payment_items = []
        
        for group in groups:
            # Get all appointments in this group
            appointments = self.db.query(Appointment).filter(
                Appointment.group_id == group.id
            ).all()
            
            for appointment in appointments:
                # Create payment item for each appointment
                payment_item = PaymentItem(
                    payment_id=payment_id,
                    item_type=ItemType.APPOINTMENT_GROUP,
                    reference_id=appointment.id,  # Reference the individual appointment
                    item_name=self._get_appointment_description(appointment),
                    unit_price=appointment.price_at_booking or Decimal('0.00'),
                    quantity=1,
                    total_amount=appointment.price_at_booking or Decimal('0.00')
                )
                
                payment_items.append(payment_item)
                self.db.add(payment_item)
        
        return payment_items
    
    def _get_appointment_description(self, appointment: Appointment) -> str:
        """
        Generate a descriptive name for the appointment.
        
        Args:
            appointment: Appointment record
            
        Returns:
            Human-readable description of the appointment
        """
        # Try to get service name from the appointment
        service_name = "Serviço"
        
        if appointment.service_id:
            from Modules.Services.models import Service
            service = self.db.query(Service).filter(
                Service.id == appointment.service_id
            ).first()
            if service:
                service_name = service.name
        
        # Include professional name if available
        professional_name = ""
        if appointment.professional_id:
            from Core.Auth.models import User
            professional = self.db.query(User).filter(
                User.id == appointment.professional_id
            ).first()
            if professional:
                professional_name = f" - {professional.full_name}"
        
        return f"{service_name}{professional_name}"
    
    def get_payment_by_id(self, payment_id: UUID) -> Optional[Payment]:
        """
        Get payment record by ID.
        
        Args:
            payment_id: Payment ID
            
        Returns:
            Payment record or None if not found
        """
        return self.db.query(Payment).filter(Payment.id == payment_id).first()
    
    def get_payments_by_client(self, client_id: UUID) -> List[Payment]:
        """
        Get all payments for a specific client.
        
        Args:
            client_id: Client ID
            
        Returns:
            List of Payment records
        """
        return self.db.query(Payment).filter(
            Payment.client_id == client_id
        ).order_by(Payment.created_at.desc()).all()
    
    def get_payment_items_by_payment(self, payment_id: UUID) -> List[PaymentItem]:
        """
        Get all payment items for a specific payment.
        
        Args:
            payment_id: Payment ID
            
        Returns:
            List of PaymentItem records
        """
        return self.db.query(PaymentItem).filter(
            PaymentItem.payment_id == payment_id
        ).all()


class PaymentFactory:
    """
    Factory class for creating PaymentService instances.
    Follows Dependency Injection principles.
    """
    
    @staticmethod
    def create_payment_service(db: Session) -> PaymentService:
        """
        Create a PaymentService instance.
        
        Args:
            db: Database session
            
        Returns:
            PaymentService instance
        """
        return PaymentService(db)


# For backward compatibility and ease of use
def create_payment_service(db: Session) -> PaymentService:
    """
    Factory function to create PaymentService.
    
    Args:
        db: Database session
        
    Returns:
        PaymentService instance
    """
    return PaymentFactory.create_payment_service(db)