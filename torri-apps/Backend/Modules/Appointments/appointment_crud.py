from typing import List, Optional, Tuple
from uuid import UUID
from datetime import date, time, datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

# Models
from .models import Appointment
from Modules.Services.models import Service
from Core.Auth.models import User # Updated import

# Schemas
from .schemas import AppointmentCreate
from .constants import AppointmentStatus

# Auth & Config
from Core.Auth.constants import UserRole

# Utils
from .appointment_utils import calculate_end_time # get_tenant_block_size removed
from .availability_service import get_daily_time_slots_for_professional


def validate_and_get_appointment_dependencies(
    db: Session, client_id: UUID, professional_id: UUID, service_id: UUID # tenant_id: UUID parameter removed
) -> Tuple[User, User, Service]: # Updated return types

    client = db.get(User, str(client_id))  # Changed UserTenant to User
    professional = db.get(User, str(professional_id))  # Changed UserTenant to User
    service = db.get(Service, str(service_id))

    if not client: # client.tenant_id check removed
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.") # Updated detail
    # Role check for client can be done here if User has a generic role or a specific CLIENT role
    # if client.role != UserRole.CLIENTE: # Assuming CLIENTE role exists
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User specified as client does not have the 'CLIENTE' role.")


    if not (professional and professional.role == UserRole.PROFISSIONAL): # professional.tenant_id check removed
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found or invalid role.") # Updated detail

    if not service: # service.tenant_id check removed (it was already removed from Service model)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.") # Updated detail

    # TODO: Validate if the professional offers the service
    # Commented out due to circular import issues with relationships
    # if professional not in service.professionals: # Uses the SQLAlchemy relationship
    #      raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail=f"Professional {professional.full_name or professional.email} does not offer service '{service.name}'."
    #     )

    return client, professional, service


def create_appointment(
    db: Session,
    appointment_data: AppointmentCreate,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> Appointment:

    # 1. Validate dependencies and permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        # If client is booking for themselves, their ID must match appointment_data.client_id
        if str(requesting_user.id) != str(appointment_data.client_id) or requesting_user.role != UserRole.CLIENTE: # Use .id for User
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients can only book appointments for themselves.")
    # If Gestor/Atendente is booking, they can book for any client_id.
    # The client_id in appointment_data will be used.

    client, professional, service = validate_and_get_appointment_dependencies(
        db, appointment_data.client_id, appointment_data.professional_id, appointment_data.service_id # tenant_id argument removed
    )

    # 2. Calculate end_time and get service price
    calculated_end_time = calculate_end_time(appointment_data.start_time, service.duration_minutes)
    price_at_booking = service.price # Price from the Service model

    # 3. Check professional's availability for the entire duration of the service
    block_size_minutes = 30 # Default block size, was get_tenant_block_size(db, tenant_id)

    # Generate fine-grained slots for the professional on the target date.
    # Appointments belonging to the same client at the exact start time are
    # ignored so a client can book multiple services simultaneously.
    daily_availability_response = get_daily_time_slots_for_professional(
        db,
        UUID(str(professional.id)), # Ensure UUID type if professional.id is string from DB
        appointment_data.appointment_date,
        # tenant_id, # Argument removed
        ignore_client_id=appointment_data.client_id,
        ignore_start_time=appointment_data.start_time,
    )

    # Check if all necessary mini-slots for the service duration are available
    current_check_time_dt = datetime.combine(appointment_data.appointment_date, appointment_data.start_time)
    service_end_dt = datetime.combine(appointment_data.appointment_date, calculated_end_time)

    required_slots_available = True
    # Iterate through the mini-slots defined by block_size_minutes that the service would occupy
    temp_time_dt = current_check_time_dt
    while temp_time_dt < service_end_dt:
        slot_found_and_available = False
        for slot in daily_availability_response.slots:
            if slot.start_time == temp_time_dt.time() and slot.end_time == (temp_time_dt + timedelta(minutes=block_size_minutes)).time():
                if slot.is_available:
                    slot_found_and_available = True
                break # Found the mini-slot, check its availability

        if not slot_found_and_available:
            required_slots_available = False
            break
        temp_time_dt += timedelta(minutes=block_size_minutes)

    if not required_slots_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The selected time slot is not available for the required service duration.")

    # 4. Create and save the appointment
    db_appointment = Appointment(
        client_id=str(client.id),
        professional_id=str(professional.id),
        service_id=str(service.id),
        # tenant_id=str(tenant_id), # tenant_id field removed from Appointment model
        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=calculated_end_time,
        status=AppointmentStatus.SCHEDULED,
        price_at_booking=price_at_booking,
        notes_by_client=appointment_data.notes_by_client,
        # paid_manually and notes_by_professional are usually set later
    )

    db.add(db_appointment)
    db.commit()

    # Eager load related objects for the response if AppointmentSchema expects them
    # This can be done here or by modifying AppointmentSchema to use selectinload/joinedload by default if always needed.
    # For now, assume schema handles it or it's done in the route if needed for response.
    # To ensure the nested fields are populated in the response as defined in AppointmentSchema:

    # Manually trigger loading of relationships if not configured for auto-loading in schema/model
    # This is often better done via options(joinedload(...)) in the query that fetches for response,
    # but since we are returning the created object directly:
    from sqlalchemy.orm import joinedload # Added import
    # Relationships are now defined, so eager load them for the response.
    stmt_for_response = (
        select(Appointment)
        .where(Appointment.id == db_appointment.id)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.professional),
            joinedload(Appointment.service)
        )
    )
    refreshed_appointment_with_relations = db.execute(stmt_for_response).scalar_one()

    # Removed audit logging
    return refreshed_appointment_with_relations


def get_appointments(
    db: Session,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User, # Updated type
    professional_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[AppointmentStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Appointment]:

    stmt = select(Appointment) # Initial query without tenant_id

    # Permission-based filtering
    if requesting_user.role == UserRole.CLIENTE:
        if client_id and str(client_id) != str(requesting_user.id): # Client trying to query for another client. Use .id
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients can only view their own appointments.")
        stmt = stmt.where(Appointment.client_id == str(requesting_user.id))  # Use .id
    elif requesting_user.role == UserRole.PROFISSIONAL:
        if professional_id and str(professional_id) != str(requesting_user.id): # Prof trying to query for another prof. Use .id
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only view their own appointments.")
        stmt = stmt.where(Appointment.professional_id == str(requesting_user.id))  # Use .id
    else: # GESTOR, ATENDENTE can use filters (potentially all appointments if no other filters)
        if professional_id:
            stmt = stmt.where(Appointment.professional_id == str(professional_id))
        if client_id:
            stmt = stmt.where(Appointment.client_id == str(client_id))

    # Optional filters
    if date_from:
        stmt = stmt.where(Appointment.appointment_date >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.appointment_date <= date_to)
    if status:
        stmt = stmt.where(Appointment.status == status)

    stmt = stmt.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).offset(skip).limit(limit)

    # Relationships are commented out, so no eager loading needed

    appointments = db.execute(stmt).scalars().all()
    return list(appointments)


def get_appointment_by_id(
    db: Session,
    appointment_id: UUID,
    # tenant_id: UUID, # Parameter removed
    requesting_user: User # Updated type
) -> Appointment | None:

    stmt = select(Appointment).where(
        Appointment.id == str(appointment_id) # Convert UUID to string for MySQL compatibility
        # Appointment.tenant_id == str(tenant_id) # Filter removed
    )
    # Relationships are commented out, so no eager loading
    appointment = db.execute(stmt).scalars().first()

    if not appointment:
        return None # Handled as 404 in route

    # Permission check
    if requesting_user.role == UserRole.CLIENTE and appointment.client_id != str(requesting_user.id): # Use .id
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client can only view their own appointment details.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != str(requesting_user.id): # Use .id
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professional can only view their own appointment details.")
    # GESTOR and ATENDENTE can view any appointment (as tenant_id filter is removed)

    return appointment