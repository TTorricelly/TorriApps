"""
Kanban Board Service Functions
Handles appointment group operations for the front-desk kanban board.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, date, timedelta
from decimal import Decimal
import pytz
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from .models import AppointmentGroup, Appointment
from .constants import AppointmentGroupStatus, AppointmentStatus
from Core.Auth.models import User
from Modules.Services.models import Service
from Core.Auth.constants import UserRole
from Config.Settings import settings


def get_appointment_groups_for_kanban(
    db: Session,
    tenant_id: str,
    date_filter: Optional[date] = None,
    status_filter: Optional[AppointmentGroupStatus] = None
) -> List[Dict[str, Any]]:
    """
    Get appointment groups formatted for kanban board display.
    
    Args:
        db: Database session
        tenant_id: Tenant identifier
        date_filter: Optional date to filter groups (defaults to today)
        status_filter: Optional status to filter groups
        
    Returns:
        List of appointment groups with aggregated data for kanban display
    """
    if date_filter is None:
        # Use Brazil timezone for correct local date
        brazil_tz = pytz.timezone('America/Sao_Paulo')
        brazil_now = datetime.now(brazil_tz)
        date_filter = brazil_now.date()
    
    # Base query with joins for client and service data
    query = db.query(
        AppointmentGroup.id,
        AppointmentGroup.client_id,
        AppointmentGroup.total_duration_minutes,
        AppointmentGroup.total_price,
        AppointmentGroup.start_time,
        AppointmentGroup.end_time,
        AppointmentGroup.status,
        AppointmentGroup.notes_by_client,
        AppointmentGroup.created_at,
        AppointmentGroup.updated_at,
        User.full_name.label('client_name'),
        User.nickname.label('client_nickname'),
        func.string_agg(Service.name, ', ').label('service_names')
    ).select_from(AppointmentGroup)\
     .join(User, AppointmentGroup.client_id == User.id)\
     .join(Appointment, AppointmentGroup.id == Appointment.group_id)\
     .join(Service, Appointment.service_id == Service.id)\
     .filter(func.date(AppointmentGroup.start_time) == date_filter)
    
    # Apply status filter if provided
    if status_filter:
        query = query.filter(AppointmentGroup.status == status_filter)
    
    # Group by appointment group fields and order by start time
    query = query.group_by(
        AppointmentGroup.id,
        AppointmentGroup.client_id,
        AppointmentGroup.total_duration_minutes,
        AppointmentGroup.total_price,
        AppointmentGroup.start_time,
        AppointmentGroup.end_time,
        AppointmentGroup.status,
        AppointmentGroup.notes_by_client,
        AppointmentGroup.created_at,
        AppointmentGroup.updated_at,
        User.full_name,
        User.nickname
    ).order_by(AppointmentGroup.start_time)
    
    results = query.all()
    
    # Format results for kanban board
    kanban_groups = []
    for row in results:
        kanban_groups.append({
            'id': str(row.id),
            'client_id': str(row.client_id),
            'client_name': row.client_name,
            'client_nickname': row.client_nickname,
            'service_names': row.service_names,
            'total_duration_minutes': row.total_duration_minutes,
            'total_price': float(row.total_price),
            'start_time': row.start_time.isoformat(),
            'end_time': row.end_time.isoformat(),
            'status': row.status.value,
            'notes_by_client': row.notes_by_client,
            'created_at': row.created_at.isoformat(),
            'updated_at': row.updated_at.isoformat()
        })
    
    return kanban_groups


def update_appointment_group_status(
    db: Session,
    group_id: UUID,
    new_status: AppointmentGroupStatus,
    tenant_id: str
) -> Optional[Dict[str, Any]]:
    """
    Update the status of an appointment group and all its appointments.
    
    Args:
        db: Database session
        group_id: ID of the appointment group to update
        new_status: New status to set
        tenant_id: Tenant identifier
        
    Returns:
        Updated appointment group data or None if not found
    """
    # Get the appointment group
    group = db.query(AppointmentGroup).filter(
        AppointmentGroup.id == group_id
    ).first()
    
    if not group:
        return None
    
    # Update group status
    group.status = new_status
    group.updated_at = datetime.utcnow()
    
    # Map group status to individual appointment status
    appointment_status_mapping = {
        AppointmentGroupStatus.SCHEDULED: AppointmentStatus.SCHEDULED,
        AppointmentGroupStatus.CONFIRMED: AppointmentStatus.CONFIRMED,
        AppointmentGroupStatus.WALK_IN: AppointmentStatus.WALK_IN,
        AppointmentGroupStatus.ARRIVED: AppointmentStatus.ARRIVED,
        AppointmentGroupStatus.IN_SERVICE: AppointmentStatus.IN_SERVICE,
        AppointmentGroupStatus.READY_TO_PAY: AppointmentStatus.READY_TO_PAY,
        AppointmentGroupStatus.COMPLETED: AppointmentStatus.COMPLETED,
        AppointmentGroupStatus.CANCELLED: AppointmentStatus.CANCELLED,
    }
    
    # Update all appointments in the group
    if new_status in appointment_status_mapping:
        appointment_status = appointment_status_mapping[new_status]
        db.query(Appointment).filter(
            Appointment.group_id == group_id
        ).update({
            'status': appointment_status,
            'updated_at': datetime.utcnow()
        })
    
    db.commit()
    db.refresh(group)
    
    # Return formatted group data
    client = db.query(User).filter(User.id == group.client_id).first()
    services_query = db.query(func.string_agg(Service.name, ', '))\
                      .select_from(Appointment)\
                      .join(Service, Appointment.service_id == Service.id)\
                      .filter(Appointment.group_id == group_id)
    service_names = services_query.scalar() or ""
    
    return {
        'id': str(group.id),
        'client_id': str(group.client_id),
        'client_name': client.full_name if client else "Unknown Client",
        'client_nickname': client.nickname if client else None,
        'service_names': service_names,
        'total_duration_minutes': group.total_duration_minutes,
        'total_price': float(group.total_price),
        'start_time': group.start_time.isoformat(),
        'end_time': group.end_time.isoformat(),
        'status': group.status.value,
        'notes_by_client': group.notes_by_client,
        'created_at': group.created_at.isoformat(),
        'updated_at': group.updated_at.isoformat()
    }


def create_walk_in_appointment_group_with_assignments(
    db: Session,
    client_data: Dict[str, Any],
    services_data: List[Dict[str, Any]],  # Now includes professional_id per service
    tenant_id: str
) -> Dict[str, Any]:
    """
    Create a walk-in appointment group with individual service-professional assignments.
    
    Args:
        db: Database session
        client_data: Client information (name, phone, email)
        services_data: List of services with IDs and individual professional_ids
        tenant_id: Tenant identifier
        
    Returns:
        Created appointment group data
    """
    # Create or get client
    client = None
    
    # If client ID is provided, get existing client
    if client_data.get('id'):
        client = db.query(User).filter(User.id == client_data['id']).first()
        if not client:
            raise ValueError(f"Client with ID {client_data['id']} not found")
    else:
        # For new clients, check if exists by email first
        if client_data.get('email'):
            client = db.query(User).filter(User.email == client_data['email']).first()
        
        if not client:
            # Create new client
            if not client_data.get('name'):
                raise ValueError("Client name is required for new clients")
            
            # Use the provided email or None if not provided
            email = client_data.get('email') or None
            
            client = User(
                id=str(uuid4()),
                full_name=client_data.get('name', 'Walk-in Client'),
                nickname=client_data.get('nickname'),
                email=email,
                phone_number=client_data.get('phone', ''),
                cpf=client_data.get('cpf'),
                address_street=client_data.get('address_street'),
                address_number=client_data.get('address_number'),
                address_complement=client_data.get('address_complement'),
                address_neighborhood=client_data.get('address_neighborhood'),
                address_city=client_data.get('address_city'),
                address_state=client_data.get('address_state'),
                address_cep=client_data.get('address_cep'),
                role=UserRole.CLIENTE,
                is_active=True
            )
            db.add(client)
            db.flush()  # Get the ID without committing
    
    # Calculate totals from services
    total_duration = 0
    total_price = Decimal('0.00')
    
    services = []
    for service_data in services_data:
        service = db.query(Service).filter(Service.id == service_data['id']).first()
        if service:
            services.append({
                'service': service,
                'professional_id': service_data['professional_id']
            })
            total_duration += service.duration_minutes
            total_price += service.price
    
    if not services:
        raise ValueError("No valid services provided")
    
    # Create appointment group using Brazil timezone
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    now = datetime.now(brazil_tz).replace(tzinfo=None)  # Remove timezone info for database
    start_time = now.replace(second=0, microsecond=0)
    end_time = start_time.replace(
        hour=(start_time.hour + total_duration // 60) % 24,
        minute=(start_time.minute + total_duration % 60) % 60
    )
    
    appointment_group = AppointmentGroup(
        client_id=client.id,
        total_duration_minutes=total_duration,
        total_price=total_price,
        start_time=start_time,
        end_time=end_time,
        status=AppointmentGroupStatus.WALK_IN,
        created_at=now,
        updated_at=now
    )
    
    db.add(appointment_group)
    db.flush()  # Get the group ID
    
    # Create individual appointments with assigned professionals
    current_time = start_time
    for service_info in services:
        service = service_info['service']
        professional_id = service_info['professional_id']
        
        appointment_end = current_time + timedelta(minutes=service.duration_minutes)
        
        appointment = Appointment(
            client_id=client.id,
            professional_id=professional_id,
            service_id=service.id,
            group_id=appointment_group.id,
            appointment_date=current_time.date(),
            start_time=current_time.time(),
            end_time=appointment_end.time(),
            status=AppointmentStatus.WALK_IN,
            price_at_booking=service.price,
            created_at=now,
            updated_at=now
        )
        
        db.add(appointment)
        current_time = appointment_end
    
    db.commit()
    db.refresh(appointment_group)
    
    # Return formatted group data
    service_names = ', '.join([service_info['service'].name for service_info in services])
    
    return {
        'id': str(appointment_group.id),
        'client_id': str(client.id),
        'client_name': client.full_name,
        'client_nickname': client.nickname,
        'service_names': service_names,
        'total_duration_minutes': appointment_group.total_duration_minutes,
        'total_price': float(appointment_group.total_price),
        'start_time': appointment_group.start_time.isoformat(),
        'end_time': appointment_group.end_time.isoformat(),
        'status': appointment_group.status.value,
        'notes_by_client': appointment_group.notes_by_client,
        'created_at': appointment_group.created_at.isoformat(),
        'updated_at': appointment_group.updated_at.isoformat()
    }


def create_walk_in_appointment_group(
    db: Session,
    client_data: Dict[str, Any],
    services_data: List[Dict[str, Any]],
    professional_id: UUID,
    tenant_id: str
) -> Dict[str, Any]:
    """
    Create a walk-in appointment group with client and services.
    
    Args:
        db: Database session
        client_data: Client information (name, phone, email)
        services_data: List of services with IDs and prices
        professional_id: ID of the professional providing services
        tenant_id: Tenant identifier
        
    Returns:
        Created appointment group data
    """
    # Create or get client
    client = None
    
    # If client ID is provided, get existing client
    if client_data.get('id'):
        client = db.query(User).filter(User.id == client_data['id']).first()
        if not client:
            raise ValueError(f"Client with ID {client_data['id']} not found")
    else:
        # For new clients, check if exists by email first
        if client_data.get('email'):
            client = db.query(User).filter(User.email == client_data['email']).first()
        
        if not client:
            # Create new client
            if not client_data.get('name'):
                raise ValueError("Client name is required for new clients")
            
            # Use the provided email or None if not provided
            email = client_data.get('email') or None
            
            client = User(
                id=str(uuid4()),
                full_name=client_data.get('name', 'Walk-in Client'),
                nickname=client_data.get('nickname'),
                email=email,
                phone_number=client_data.get('phone', ''),
                cpf=client_data.get('cpf'),
                address_street=client_data.get('address_street'),
                address_number=client_data.get('address_number'),
                address_complement=client_data.get('address_complement'),
                address_neighborhood=client_data.get('address_neighborhood'),
                address_city=client_data.get('address_city'),
                address_state=client_data.get('address_state'),
                address_cep=client_data.get('address_cep'),
                role=UserRole.CLIENTE,
                is_active=True
            )
            db.add(client)
            db.flush()  # Get the ID without committing
    
    # Calculate totals from services
    total_duration = 0
    total_price = Decimal('0.00')
    
    services = []
    for service_data in services_data:
        service = db.query(Service).filter(Service.id == service_data['id']).first()
        if service:
            services.append(service)
            total_duration += service.duration_minutes
            total_price += service.price
    
    if not services:
        raise ValueError("No valid services provided")
    
    # Create appointment group using Brazil timezone
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    now = datetime.now(brazil_tz).replace(tzinfo=None)  # Remove timezone info for database
    start_time = now.replace(second=0, microsecond=0)
    end_time = start_time.replace(
        hour=(start_time.hour + total_duration // 60) % 24,
        minute=(start_time.minute + total_duration % 60) % 60
    )
    
    appointment_group = AppointmentGroup(
        client_id=client.id,
        total_duration_minutes=total_duration,
        total_price=total_price,
        start_time=start_time,
        end_time=end_time,
        status=AppointmentGroupStatus.WALK_IN,
        created_at=now,
        updated_at=now
    )
    
    db.add(appointment_group)
    db.flush()  # Get the group ID
    
    # Create individual appointments
    current_time = start_time
    for service in services:
        appointment_end = current_time + timedelta(minutes=service.duration_minutes)
        
        appointment = Appointment(
            client_id=client.id,
            professional_id=professional_id,
            service_id=service.id,
            group_id=appointment_group.id,
            appointment_date=current_time.date(),
            start_time=current_time.time(),
            end_time=appointment_end.time(),
            status=AppointmentStatus.WALK_IN,
            price_at_booking=service.price,
            created_at=now,
            updated_at=now
        )
        
        db.add(appointment)
        current_time = appointment_end
    
    db.commit()
    db.refresh(appointment_group)
    
    # Return formatted group data
    service_names = ', '.join([service.name for service in services])
    
    return {
        'id': str(appointment_group.id),
        'client_id': str(client.id),
        'client_name': client.full_name,
        'client_nickname': client.nickname,
        'service_names': service_names,
        'total_duration_minutes': appointment_group.total_duration_minutes,
        'total_price': float(appointment_group.total_price),
        'start_time': appointment_group.start_time.isoformat(),
        'end_time': appointment_group.end_time.isoformat(),
        'status': appointment_group.status.value,
        'notes_by_client': appointment_group.notes_by_client,
        'created_at': appointment_group.created_at.isoformat(),
        'updated_at': appointment_group.updated_at.isoformat()
    }


def create_merged_checkout_session(
    db: Session,
    group_ids: List[UUID],
    tenant_id: str
) -> Dict[str, Any]:
    """
    Create a merged checkout session for multiple appointment groups.
    
    Args:
        db: Database session
        group_ids: List of appointment group IDs to merge
        tenant_id: Tenant identifier
        
    Returns:
        Merged checkout session data
    """
    # Get all appointment groups
    groups = db.query(AppointmentGroup).filter(
        AppointmentGroup.id.in_(group_ids)
    ).all()
    
    if not groups:
        raise ValueError("No valid appointment groups found")
    
    # Calculate merged totals
    total_price = sum([group.total_price for group in groups])
    total_duration = sum([group.total_duration_minutes for group in groups])
    
    # Get all services from all groups
    all_services = []
    for group in groups:
        appointments = db.query(Appointment).filter(
            Appointment.group_id == group.id
        ).all()
        
        for appointment in appointments:
            service = db.query(Service).filter(
                Service.id == appointment.service_id
            ).first()
            professional = db.query(User).filter(
                User.id == appointment.professional_id
            ).first()
            
            if service:
                service_data = {
                    'id': str(service.id),
                    'name': service.name,
                    'price': float(appointment.price_at_booking),
                    'duration_minutes': service.duration_minutes,
                    'professional_name': professional.full_name if professional else "N/A",
                    'appointment_id': str(appointment.id),
                    'group_id': str(group.id)
                }
                all_services.append(service_data)
    
    # Get client info (assuming all groups are for same client)
    client = db.query(User).filter(User.id == groups[0].client_id).first()
    
    return {
        'session_id': f"merged_{len(group_ids)}_{int(datetime.now().timestamp())}",
        'group_ids': [str(group.id) for group in groups],
        'client_name': client.full_name if client else "Unknown Client",
        'total_price': float(total_price),
        'total_duration_minutes': total_duration,
        'services': all_services,
        'created_at': datetime.now().isoformat()
    }


def process_appointment_payment(
    db: Session,
    payment_data: Any,  # AppointmentPaymentRequest
    tenant_id: str
) -> Dict[str, Any]:
    """
    Process payment for multiple appointment groups.
    
    Args:
        db: Database session
        payment_data: Payment details including group IDs, amounts, and payment method
        tenant_id: Tenant identifier
        
    Returns:
        Payment processing result
    """
    # Get all appointment groups to be paid
    groups = db.query(AppointmentGroup).filter(
        AppointmentGroup.id.in_(payment_data.group_ids)
    ).all()
    
    if not groups:
        raise ValueError("No valid appointment groups found for payment")
    
    # Validate payment amount matches groups total
    expected_subtotal = sum([group.total_price for group in groups])
    if abs(float(payment_data.subtotal) - float(expected_subtotal)) > 0.01:
        raise ValueError(f"Payment subtotal {payment_data.subtotal} does not match expected {expected_subtotal}")
    
    # Generate payment ID
    payment_id = f"pay_{int(datetime.now().timestamp())}_{len(payment_data.group_ids)}"
    
    # Update all groups to COMPLETED status
    for group in groups:
        group.status = AppointmentGroupStatus.COMPLETED
        group.updated_at = datetime.utcnow()
        
        # Update all appointments in the group
        appointments_in_group = db.query(Appointment).filter(
            Appointment.group_id == group.id
        ).all()
        
        for appointment in appointments_in_group:
            appointment.status = AppointmentStatus.COMPLETED
            appointment.paid_manually = True
            appointment.updated_at = datetime.utcnow()
            
            # Create commission for each completed appointment
            try:
                from Modules.Commissions.services import CommissionService
                commission_service = CommissionService(db)
                commission_service.create_commission_for_appointment(appointment.id)
            except Exception as e:
                # Log the error but don't fail the payment process
                print(f"Warning: Failed to create commission for appointment {appointment.id}: {str(e)}")
    
    # TODO: Here you would integrate with a real payment processor
    # For now, we just mark as completed for cash/manual payments
    
    db.commit()
    
    return {
        'payment_id': payment_id,
        'group_ids': [str(group_id) for group_id in payment_data.group_ids],
        'total_amount': float(payment_data.total_amount),
        'payment_method': payment_data.payment_method,
        'status': 'completed',
        'processed_at': datetime.now().isoformat(),
        'message': 'Pagamento processado com sucesso'
    }


def add_services_to_appointment_group(
    db: Session,
    group_id: UUID,
    services_data: List[Any],  # Can be either Dict or Pydantic objects
    tenant_id: str = "default"
):
    """
    Add additional services to an existing appointment group.
    
    Args:
        db: Database session
        group_id: ID of the existing appointment group
        services_data: List of services with professional assignments
        tenant_id: Tenant identifier
    
    Returns:
        Updated appointment group information
    """
    # Get existing appointment group
    appointment_group = db.query(AppointmentGroup).filter(
        AppointmentGroup.id == group_id
    ).first()
    
    if not appointment_group:
        raise ValueError(f"Appointment group with ID {group_id} not found")
    
    # Get client for the group
    client = db.query(User).filter(User.id == appointment_group.client_id).first()
    if not client:
        raise ValueError(f"Client for appointment group not found")
    
    # Calculate additional totals from new services
    additional_duration = 0
    additional_price = Decimal('0.00')
    
    new_appointments = []
    for service_data in services_data:
        # Handle both dict and Pydantic object formats
        service_id = service_data.id if hasattr(service_data, 'id') else service_data['id']
        professional_id = service_data.professional_id if hasattr(service_data, 'professional_id') else service_data['professional_id']
        
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            continue
            
        additional_duration += service.duration_minutes
        additional_price += service.price
        
        # Get the appointment with the latest end time to schedule new services consecutively
        last_appointment = db.query(Appointment).filter(
            Appointment.group_id == group_id
        ).order_by(Appointment.end_time.desc()).first()
        
        if last_appointment:
            # Convert last appointment end to datetime for calculation
            last_end_datetime = datetime.combine(
                last_appointment.appointment_date,
                last_appointment.end_time
            )
            current_start_time = last_end_datetime
        else:
            # Fallback to group start time
            current_start_time = appointment_group.start_time
        
        # Calculate new appointment end time
        appointment_end = current_start_time + timedelta(minutes=service.duration_minutes)
        
        # Create new appointment
        appointment = Appointment(
            client_id=client.id,
            professional_id=professional_id,
            service_id=service.id,
            group_id=appointment_group.id,
            appointment_date=current_start_time.date(),
            start_time=current_start_time.time(),
            end_time=appointment_end.time(),
            status=appointment_group.status,  # Match group status
            price_at_booking=service.price,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(appointment)
        new_appointments.append(appointment)
    
    if not new_appointments:
        raise ValueError("No valid services provided")
    
    # Update appointment group totals
    appointment_group.total_duration_minutes += additional_duration
    appointment_group.total_price += additional_price
    appointment_group.updated_at = datetime.now()
    
    # If there are new appointments, update group end time
    if new_appointments:
        last_new_appointment = max(new_appointments, key=lambda a: a.end_time)
        # Update group end time to the last new appointment's end time
        appointment_group.end_time = datetime.combine(
            last_new_appointment.appointment_date,
            last_new_appointment.end_time
        )
    
    db.commit()
    db.refresh(appointment_group)
    
    # Return the SQLAlchemy object directly (will be converted to schema by FastAPI)
    return appointment_group


def remove_service_from_appointment_group(
    db: Session,
    group_id: UUID,
    service_id: UUID,
    tenant_id: str = "default"
):
    """
    Remove a service from an existing appointment group.
    
    Args:
        db: Database session
        group_id: ID of the appointment group
        service_id: ID of the service to remove
        tenant_id: Tenant identifier
    
    Returns:
        Success message and updated group information
    """
    # Get existing appointment group
    appointment_group = db.query(AppointmentGroup).filter(
        AppointmentGroup.id == group_id
    ).first()
    
    if not appointment_group:
        raise ValueError(f"Appointment group with ID {group_id} not found")
    
    # Find appointments in this group with the specified service
    appointments_to_remove = db.query(Appointment).filter(
        and_(
            Appointment.group_id == group_id,
            Appointment.service_id == service_id
        )
    ).all()
    
    if not appointments_to_remove:
        raise ValueError(f"No appointments found with service ID {service_id} in group {group_id}")
    
    # Calculate totals to subtract
    duration_to_subtract = 0
    price_to_subtract = Decimal('0.00')
    
    for appointment in appointments_to_remove:
        # Get the service details for calculations
        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        if service:
            duration_to_subtract += service.duration_minutes
            price_to_subtract += appointment.price_at_booking or service.price
        
        # Delete the appointment
        db.delete(appointment)
    
    # Update appointment group totals
    appointment_group.total_duration_minutes = max(0, appointment_group.total_duration_minutes - duration_to_subtract)
    appointment_group.total_price = max(Decimal('0.00'), appointment_group.total_price - price_to_subtract)
    appointment_group.updated_at = datetime.now()
    
    # Check if there are any appointments left in the group
    remaining_appointments = db.query(Appointment).filter(
        Appointment.group_id == group_id
    ).all()
    
    if not remaining_appointments:
        # If no appointments left, we could either delete the group or mark it as cancelled
        # For now, let's just set totals to zero and keep the group for audit purposes
        appointment_group.total_duration_minutes = 0
        appointment_group.total_price = Decimal('0.00')
    else:
        # Recalculate group end time based on remaining appointments
        last_appointment = max(remaining_appointments, key=lambda a: datetime.combine(a.appointment_date, a.end_time))
        appointment_group.end_time = datetime.combine(
            last_appointment.appointment_date,
            last_appointment.end_time
        )
    
    db.commit()
    db.refresh(appointment_group)
    
    return {
        'success': True,
        'message': f'Successfully removed {len(appointments_to_remove)} appointment(s) with service ID {service_id}',
        'removed_appointments_count': len(appointments_to_remove),
        'remaining_appointments_count': len(remaining_appointments),
        'group_id': str(appointment_group.id),
        'total_duration_minutes': appointment_group.total_duration_minutes,
        'total_price': float(appointment_group.total_price)
    }