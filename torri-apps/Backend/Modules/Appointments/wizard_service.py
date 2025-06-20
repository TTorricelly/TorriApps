"""
Multi-Service Wizard Service Functions
Implements business logic for the multi-service appointment booking wizard.
"""

from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
import calendar

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_
from fastapi import HTTPException, status

# Models
from .models import Appointment, AppointmentGroup
from Modules.Services.models import Service
from Core.Auth.models import User

# Schemas
from .schemas import (
    MultiServiceAvailabilityRequest, MultiServiceAvailabilityResponse,
    AvailableProfessionalsResponse, MultiServiceBookingRequest, 
    MultiServiceBookingResponse, AppointmentGroupSchema, AppointmentSchema
)

# Constants
from .constants import AppointmentStatus, AppointmentGroupStatus
from Core.Auth.constants import UserRole

# Services
from .multi_service_availability_service import MultiServiceAvailabilityService
from .appointment_crud import validate_and_get_appointment_dependencies


def get_available_professionals_for_wizard(
    db: Session,
    service_ids: List[UUID],
    target_date: date
) -> AvailableProfessionalsResponse:
    """
    Get professionals who are available and qualified for the specified services on the target date.
    
    Args:
        db: Database session
        service_ids: List of service IDs
        target_date: Target date for availability
        
    Returns:
        Response with available professionals
    """
    availability_service = MultiServiceAvailabilityService(db)
    return availability_service.get_available_professionals(service_ids, target_date)


def get_multi_service_availability(
    db: Session,
    request: MultiServiceAvailabilityRequest
) -> MultiServiceAvailabilityResponse:
    """
    Get available time slots for multiple services with parallel and sequential options.
    
    Args:
        db: Database session
        request: Availability request with services, date, and preferences
        
    Returns:
        Response with available time slots
    """
    availability_service = MultiServiceAvailabilityService(db)
    return availability_service.get_available_slots(request)


def create_multi_service_booking(
    db: Session,
    booking_data: MultiServiceBookingRequest,
    requesting_user: User
) -> MultiServiceBookingResponse:
    """
    Create a multi-service appointment booking with an appointment group.
    
    Args:
        db: Database session
        booking_data: Booking request data
        requesting_user: User making the request
        
    Returns:
        Response with created appointment group and appointments
    """
    # Validate permissions
    if requesting_user.role == UserRole.CLIENTE:
        # Client can only book for themselves
        if str(booking_data.client_id) != requesting_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clientes só podem agendar para si mesmos"
            )
    elif requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para criar agendamentos"
        )
    
    # Validate client exists
    client = db.get(User, str(booking_data.client_id))
    if not client or client.role != UserRole.CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    # Get services and validate they exist
    service_ids = [str(service.service_id) for service in booking_data.selected_slot.services]
    services = db.execute(
        select(Service)
        .options(joinedload(Service.station_requirements))
        .where(Service.id.in_(service_ids))
    ).scalars().all()
    
    if len(services) != len(service_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Um ou mais serviços não foram encontrados"
        )
    
    # Validate professionals exist and are qualified
    professional_ids = [str(service.professional_id) for service in booking_data.selected_slot.services]
    professionals = db.execute(
        select(User)
        .where(
            and_(
                User.id.in_(professional_ids),
                User.role == UserRole.PROFISSIONAL
            )
        )
    ).scalars().all()
    
    if len(professionals) != len(set(professional_ids)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Um ou mais profissionais não foram encontrados"
        )
    
    # Calculate total duration and price
    total_duration = 0
    total_price = 0
    
    if booking_data.selected_slot.execution_type == "parallel":
        # For parallel execution, total duration is the maximum duration
        total_duration = max(
            service.duration_minutes for service in services
        )
        total_price = sum(service.price for service in services)
    else:
        # For sequential execution, total duration is the sum
        total_duration = sum(service.duration_minutes for service in services)
        total_price = sum(service.price for service in services)
    
    # Create datetime objects for start and end times
    start_datetime = datetime.combine(booking_data.date, booking_data.selected_slot.start_time)
    end_datetime = datetime.combine(booking_data.date, booking_data.selected_slot.end_time)
    
    try:
        # Create appointment group
        appointment_group = AppointmentGroup(
            client_id=str(booking_data.client_id),
            total_duration_minutes=total_duration,
            total_price=total_price,
            start_time=start_datetime,
            end_time=end_datetime,
            status=AppointmentGroupStatus.SCHEDULED,
            notes_by_client=booking_data.notes_by_client
        )
        
        db.add(appointment_group)
        db.flush()  # Flush to get the group ID
        
        # Create individual appointments for each service
        appointments = []
        
        for service_booking in booking_data.selected_slot.services:
            # Find the corresponding service
            service = next(s for s in services if s.id == str(service_booking.service_id))
            
            # Create appointment
            appointment = Appointment(
                client_id=str(booking_data.client_id),
                professional_id=str(service_booking.professional_id),
                service_id=str(service_booking.service_id),
                group_id=appointment_group.id,
                appointment_date=booking_data.date,
                start_time=service_booking.start_time,
                end_time=service_booking.end_time,
                status=AppointmentStatus.SCHEDULED,
                price_at_booking=service.price,
                paid_manually=False,
                notes_by_client=booking_data.notes_by_client
            )
            
            db.add(appointment)
            appointments.append(appointment)
        
        # Commit the transaction
        db.commit()
        
        # Refresh to get relationships
        db.refresh(appointment_group)
        for appointment in appointments:
            db.refresh(appointment)
        
        # Create response
        appointment_group_schema = AppointmentGroupSchema.from_orm(appointment_group)
        
        return MultiServiceBookingResponse(
            appointment_group=appointment_group_schema,
            message="Agendamento multisserviço criado com sucesso"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar agendamento: {str(e)}"
        )


def get_available_dates_for_services(
    db: Session,
    service_ids: List[UUID],
    year: int,
    month: int
) -> List[str]:
    """
    Get a list of dates in the specified month that have availability for all the requested services.
    
    Args:
        db: Database session
        service_ids: List of service IDs
        year: Year to check
        month: Month to check (1-12)
        
    Returns:
        List of date strings in YYYY-MM-DD format
    """
    if not service_ids:
        return []
    
    # Validate month and year
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mês deve estar entre 1 e 12"
        )
    
    if year < 2020 or year > 2030:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ano deve estar entre 2020 e 2030"
        )
    
    # Get all days in the month
    num_days = calendar.monthrange(year, month)[1]
    available_dates = []
    
    # Initialize availability service
    availability_service = MultiServiceAvailabilityService(db)
    
    # Check each day in the month
    for day in range(1, num_days + 1):
        try:
            target_date = date(year, month, day)
            
            # Skip past dates
            if target_date < date.today():
                continue
            
            # Create a basic availability request
            request = MultiServiceAvailabilityRequest(
                service_ids=service_ids,
                date=target_date,
                professionals_requested=1
            )
            
            # Check if there are any available slots
            response = availability_service.get_available_slots(request)
            
            # If there are available slots, add this date
            if response.available_slots:
                available_dates.append(target_date.strftime('%Y-%m-%d'))
                
        except Exception as e:
            # Log the error but continue checking other dates
            print(f"Error checking availability for {year}-{month:02d}-{day:02d}: {str(e)}")
            continue
    
    return available_dates