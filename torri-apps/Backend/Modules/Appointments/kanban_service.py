"""
Kanban Board Service Functions
Handles appointment group operations for the front-desk kanban board.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from .models import AppointmentGroup, Appointment
from .constants import AppointmentGroupStatus, AppointmentStatus
from Core.Auth.models import User
from Modules.Services.models import Service
from Core.Auth.constants import UserRole


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
        date_filter = date.today()
    
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
        User.full_name
    ).order_by(AppointmentGroup.start_time)
    
    results = query.all()
    
    # Format results for kanban board
    kanban_groups = []
    for row in results:
        kanban_groups.append({
            'id': str(row.id),
            'client_id': str(row.client_id),
            'client_name': row.client_name,
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
            
            # For clients without email, generate a unique placeholder
            email = client_data.get('email', '')
            if not email:
                email = f"walkin_{uuid4()}@temp.local"
            
            client = User(
                id=str(uuid4()),
                full_name=client_data.get('name', 'Walk-in Client'),
                email=email,
                phone_number=client_data.get('phone', ''),
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
    
    # Create appointment group
    now = datetime.now()
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
        appointment_end = current_time.replace(
            hour=(current_time.hour + service.duration_minutes // 60) % 24,
            minute=(current_time.minute + service.duration_minutes % 60) % 60
        )
        
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
            if service:
                all_services.append({
                    'id': str(service.id),
                    'name': service.name,
                    'price': float(appointment.price_at_booking),
                    'appointment_id': str(appointment.id),
                    'group_id': str(group.id)
                })
    
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