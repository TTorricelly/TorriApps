from typing import List, Optional, Tuple
from uuid import UUID
from datetime import date, time, datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum # Added missing import

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, case

from fastapi import HTTPException, status

# Models
from .models import Appointment
from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Modules.Services.models import Service
from Core.Auth.models import UserTenant
from Modules.Tenants.models import Tenant

# Schemas
from .schemas import (
    AppointmentCreate, AppointmentSchema, AppointmentUpdate, # AppointmentUpdate is for future use
    TimeSlot, ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    DailyServiceAvailabilityResponse, DatedTimeSlot, # For future use
    # New schemas for daily schedule
    DailyScheduleResponseSchema, ProfessionalScheduleSchema, AppointmentDetailSchema, ServiceTagSchema, BlockedSlotSchema
)
from .constants import AppointmentStatus
from Modules.Availability.constants import DayOfWeek, AvailabilityBlockType

# Auth & Config
from Core.Auth.constants import UserRole
from Config.Settings import settings
# Removed audit logging imports


# --- Helper Functions ---
def _calculate_end_time(start_time: time, duration_minutes: int) -> time:
    """Calculates the end time given a start time and duration in minutes."""
    # Combine date and time for timedelta arithmetic, then extract time
    # Using a dummy date as only time arithmetic is needed.
    dummy_date = date(2000, 1, 1)
    start_datetime = datetime.combine(dummy_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    return end_datetime.time()

def _get_tenant_block_size(db: Session, tenant_id: UUID) -> int:
    """Fetches the tenant's block_size_minutes."""
    tenant = db.get(Tenant, str(tenant_id))  # Convert UUID to string for MySQL compatibility
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found.")
    return tenant.block_size_minutes

# --- Core Availability Logic ---
def get_daily_time_slots_for_professional(
    db: Session,
    professional_id: UUID,
    target_date: date,
    tenant_id: UUID
) -> ProfessionalDailyAvailabilityResponse:
    """
    Calculates all available and unavailable time slots for a professional on a specific date,
    based on their work hours, breaks, existing appointments, and blocked times.
    The granularity of slots is determined by tenant.block_size_minutes.
    """
    block_size_minutes = _get_tenant_block_size(db, tenant_id)
    
    # Convert Python weekday (0=Monday, 1=Tuesday, etc.) to our DayOfWeek enum
    weekday_mapping = {
        0: DayOfWeek.MONDAY,
        1: DayOfWeek.TUESDAY,
        2: DayOfWeek.WEDNESDAY,
        3: DayOfWeek.THURSDAY,
        4: DayOfWeek.FRIDAY,
        5: DayOfWeek.SATURDAY,
        6: DayOfWeek.SUNDAY
    }
    target_day_of_week = weekday_mapping[target_date.weekday()]

    slots = []

    # 1. Get Professional's recurring availability for that day_of_week
    stmt_avail = select(ProfessionalAvailability).where(
        ProfessionalAvailability.professional_user_id == str(professional_id),
        ProfessionalAvailability.day_of_week == target_day_of_week,
        ProfessionalAvailability.tenant_id == str(tenant_id) # Ensure it's for the correct tenant context
    ).order_by(ProfessionalAvailability.start_time)
    working_hours_today = db.execute(stmt_avail).scalars().all()

    if not working_hours_today:
        return ProfessionalDailyAvailabilityResponse(date=target_date, slots=[])

    # 2. Get recurring breaks for that day
    stmt_breaks = select(ProfessionalBreak).where(
        ProfessionalBreak.professional_user_id == str(professional_id),
        ProfessionalBreak.day_of_week == target_day_of_week,
        ProfessionalBreak.tenant_id == str(tenant_id)
    )
    breaks_today = db.execute(stmt_breaks).scalars().all()

    # 3. Get specific date-based blocked times (includes DAY_OFF)
    stmt_blocks = select(ProfessionalBlockedTime).where(
        ProfessionalBlockedTime.professional_user_id == str(professional_id),
        ProfessionalBlockedTime.blocked_date == target_date,
        ProfessionalBlockedTime.tenant_id == str(tenant_id)
    )
    specific_blocks_today = db.execute(stmt_blocks).scalars().all()

    # Check for DAY_OFF type block
    if any(block.block_type == AvailabilityBlockType.DAY_OFF for block in specific_blocks_today):
        # If it's a day off, no slots are available.
        # We could generate slots and mark them all as unavailable, or just return empty.
        # For clarity, let's generate them within typical hours and mark as unavailable.
        # This part requires defining "typical hours" or just returning empty.
        # For now, let's assume if DAY_OFF, no slots are generated from working_hours_today.
        # A simpler approach: if DAY_OFF, the entire working_hours_today are effectively void.
        return ProfessionalDailyAvailabilityResponse(date=target_date, slots=[])


    # 4. Get existing appointments for that day
    stmt_appts = select(Appointment).where(
        Appointment.professional_id == str(professional_id),
        Appointment.appointment_date == target_date,
        Appointment.tenant_id == str(tenant_id),
        Appointment.status.in_([AppointmentStatus.SCHEDULED]) # Only scheduled appointments block time
    )
    appointments_today = db.execute(stmt_appts).scalars().all()

    # Generate all potential slots based on working hours and block_size_minutes
    for wh in working_hours_today:
        current_time = datetime.combine(target_date, wh.start_time)
        end_work_time = datetime.combine(target_date, wh.end_time)

        while current_time < end_work_time:
            slot_start_time = current_time.time()
            slot_end_time_dt = current_time + timedelta(minutes=block_size_minutes)
            slot_end_time = slot_end_time_dt.time()

            if slot_end_time_dt > end_work_time: # Do not exceed working hours
                break

            slot = TimeSlot(start_time=slot_start_time, end_time=slot_end_time, is_available=True)

            # Check against breaks
            for br in breaks_today:
                if not (slot_end_time <= br.start_time or slot_start_time >= br.end_time):
                    slot.is_available = False; break
            if not slot.is_available: slots.append(slot); current_time += timedelta(minutes=block_size_minutes); continue

            # Check against specific blocked times (BLOCKED_SLOT type)
            for sb in specific_blocks_today:
                if sb.block_type == AvailabilityBlockType.BLOCKED_SLOT:
                    if not (slot_end_time <= sb.start_time or slot_start_time >= sb.end_time): # type: ignore
                        slot.is_available = False; break
            if not slot.is_available: slots.append(slot); current_time += timedelta(minutes=block_size_minutes); continue

            # Check against appointments
            for appt in appointments_today:
                if not (slot_end_time <= appt.start_time or slot_start_time >= appt.end_time):
                    slot.is_available = False
                    slot.appointment_id = appt.id # Mark which appointment is blocking
                    break
            # No continue here, append the slot anyway to show it as booked.

            slots.append(slot)
            current_time += timedelta(minutes=block_size_minutes)

    return ProfessionalDailyAvailabilityResponse(date=target_date, slots=slots)


# --- Appointment Creation and Management ---
def _validate_and_get_appointment_dependencies(
    db: Session, client_id: UUID, professional_id: UUID, service_id: UUID, tenant_id: UUID
) -> Tuple[UserTenant, UserTenant, Service]:

    client = db.get(UserTenant, str(client_id))  # Convert UUID to string for MySQL compatibility
    professional = db.get(UserTenant, str(professional_id))  # Convert UUID to string for MySQL compatibility
    service = db.get(Service, str(service_id))  # Convert UUID to string for MySQL compatibility

    if not (client and client.tenant_id == str(tenant_id)): # Client must exist and belong to the tenant
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found in this tenant.")
    # Role check for client can be done here if UserTenant has a generic role or a specific CLIENT role
    # if client.role != UserRole.CLIENTE: # Assuming CLIENTE role exists
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User specified as client does not have the 'CLIENTE' role.")


    if not (professional and professional.tenant_id == str(tenant_id) and professional.role == UserRole.PROFISSIONAL):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found or invalid role in this tenant.")

    if not (service and service.tenant_id == str(tenant_id)): # Service must exist and belong to the tenant
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found in this tenant.")

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
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment:

    # 1. Validate dependencies and permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        # If client is booking for themselves, their ID must match appointment_data.client_id
        if requesting_user.user_id != str(appointment_data.client_id) or requesting_user.role != UserRole.CLIENTE:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients can only book appointments for themselves.")
    # If Gestor/Atendente is booking, they can book for any client_id within their tenant.
    # The client_id in appointment_data will be used.

    client, professional, service = _validate_and_get_appointment_dependencies(
        db, appointment_data.client_id, appointment_data.professional_id, appointment_data.service_id, tenant_id
    )

    # 2. Calculate end_time and get service price
    calculated_end_time = _calculate_end_time(appointment_data.start_time, service.duration_minutes)
    price_at_booking = service.price # Price from the Service model

    # 3. Check professional's availability for the entire duration of the service
    block_size_minutes = _get_tenant_block_size(db, tenant_id)

    # Generate fine-grained slots for the professional on the target date
    # This re-uses the detailed slot generation logic.
    daily_availability_response = get_daily_time_slots_for_professional(
        db, professional.id, appointment_data.appointment_date, tenant_id
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
        client_id=str(client.id),  # Convert UUID to string for MySQL compatibility
        professional_id=str(professional.id),  # Convert UUID to string for MySQL compatibility
        service_id=str(service.id),  # Convert UUID to string for MySQL compatibility
        tenant_id=str(tenant_id),  # Convert UUID to string for MySQL compatibility
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
    # from sqlalchemy.orm import selectinload # Moved import to top
    # Since relationships are commented out, just return the appointment without eager loading
    stmt_for_response = select(Appointment).where(Appointment.id == db_appointment.id)
    refreshed_appointment_with_relations = db.execute(stmt_for_response).scalar_one()

    # Removed audit logging
    return refreshed_appointment_with_relations


def get_service_availability_for_professional(
    db: Session, req: AvailabilityRequest, tenant_id: UUID
) -> List[DailyServiceAvailabilityResponse]:
    """
    Finds available time slots that can accommodate a service of specific duration.
    This function identifies contiguous available slots that can fit the entire service duration.
    
    Args:
        db: Database session
        req: Availability request containing service_id, professional_id, year, month
        tenant_id: Tenant context
        
    Returns:
        List of daily availability responses with slots that can accommodate the service
    """
    service_obj = db.get(Service, str(req.service_id))  # Convert UUID to string for MySQL compatibility
    if not service_obj or service_obj.tenant_id != str(tenant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    service_duration = service_obj.duration_minutes
    if service_duration <= 0:
        return []

    block_size_minutes = _get_tenant_block_size(db, tenant_id)
    if block_size_minutes <= 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tenant block size not configured correctly.")

    results: List[DailyServiceAvailabilityResponse] = []
    year = req.year
    month = req.month

    import calendar
    num_days = calendar.monthrange(year, month)[1]

    for day_num in range(1, num_days + 1):
        current_date = date(year, month, day_num)
        daily_availability_raw = get_daily_time_slots_for_professional(db, req.professional_id, current_date, tenant_id)

        raw_slots = daily_availability_raw.slots
        available_service_slots_for_day: List[DatedTimeSlot] = []

        if not raw_slots:
            continue

        # Calculate number of consecutive slots needed for the service
        slots_needed_for_service = (service_duration + block_size_minutes - 1) // block_size_minutes

        if slots_needed_for_service <= 0:
            continue

        # Find contiguous available slots
        available_service_slots_for_day = _find_contiguous_available_slots(
            raw_slots, service_duration, block_size_minutes, current_date
        )

        if available_service_slots_for_day:
            results.append(DailyServiceAvailabilityResponse(date=current_date, available_slots=available_service_slots_for_day))

    return results


def _find_contiguous_available_slots(
    raw_slots: List[TimeSlot], 
    service_duration: int, 
    block_size_minutes: int,
    current_date: date
) -> List[DatedTimeSlot]:
    """
    Finds all possible contiguous time slots that can accommodate a service duration.
    
    This function implements a more robust algorithm that:
    1. Validates that slots are truly contiguous (no gaps in time)
    2. Handles edge cases where slots might not be perfectly aligned
    3. Ensures the entire service duration fits within available slots
    
    Args:
        raw_slots: List of available/unavailable time slots for the day
        service_duration: Duration of service in minutes
        block_size_minutes: Size of each time block in minutes
        current_date: Date for the slots
        
    Returns:
        List of DatedTimeSlot that can accommodate the service
    """
    available_service_slots: List[DatedTimeSlot] = []
    
    if not raw_slots:
        return available_service_slots
    
    slots_needed_for_service = (service_duration + block_size_minutes - 1) // block_size_minutes
    
    i = 0
    while i <= len(raw_slots) - slots_needed_for_service:
        # Check if we have enough consecutive available slots starting at position i
        can_accommodate_service = True
        consecutive_slots = []
        
        for j in range(slots_needed_for_service):
            current_slot_index = i + j
            
            if current_slot_index >= len(raw_slots):
                can_accommodate_service = False
                break
                
            current_slot = raw_slots[current_slot_index]
            
            # Check if slot is available
            if not current_slot.is_available:
                can_accommodate_service = False
                break
            
            consecutive_slots.append(current_slot)
            
            # Verify slots are truly contiguous (no time gaps)
            if j > 0:
                previous_slot = consecutive_slots[j - 1]
                if current_slot.start_time != previous_slot.end_time:
                    # There's a gap between slots - not truly contiguous
                    can_accommodate_service = False
                    break
        
        if can_accommodate_service and consecutive_slots:
            # Create a service slot using the first slot's start time and calculated end time
            service_start_time = consecutive_slots[0].start_time
            service_end_time = _calculate_end_time(service_start_time, service_duration)
            
            # Verify the calculated end time doesn't exceed the last available slot
            last_slot = consecutive_slots[-1]
            if service_end_time <= last_slot.end_time:
                available_service_slots.append(
                    DatedTimeSlot(
                        date=current_date,
                        start_time=service_start_time,
                        end_time=service_end_time
                    )
                )
        
        # Move to next potential starting position
        i += 1
    
    return available_service_slots


# --- Appointment Listing and Retrieval ---
def get_appointments(
    db: Session,
    tenant_id: UUID,
    requesting_user: UserTenant,
    professional_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[AppointmentStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Appointment]:

    stmt = select(Appointment).where(Appointment.tenant_id == str(tenant_id))

    # Permission-based filtering
    if requesting_user.role == UserRole.CLIENTE:
        if client_id and str(client_id) != str(requesting_user.user_id): # Client trying to query for another client
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients can only view their own appointments.")
        stmt = stmt.where(Appointment.client_id == str(requesting_user.user_id))  # Convert to string
    elif requesting_user.role == UserRole.PROFISSIONAL:
        if professional_id and str(professional_id) != str(requesting_user.user_id): # Prof trying to query for another prof
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only view their own appointments.")
        stmt = stmt.where(Appointment.professional_id == str(requesting_user.user_id))  # Convert to string
    else: # GESTOR, ATENDENTE can use filters
        if professional_id:
            stmt = stmt.where(Appointment.professional_id == str(professional_id))  # Convert UUID to string
        if client_id:
            stmt = stmt.where(Appointment.client_id == str(client_id))  # Convert UUID to string

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
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment | None:

    stmt = select(Appointment).where(
        Appointment.id == str(appointment_id),  # Convert UUID to string for MySQL compatibility
        Appointment.tenant_id == str(tenant_id)  # Convert UUID to string for MySQL compatibility
    )
    # Relationships are commented out, so no eager loading
    appointment = db.execute(stmt).scalars().first()

    if not appointment:
        return None # Handled as 404 in route

    # Permission check
    if requesting_user.role == UserRole.CLIENTE and appointment.client_id != str(requesting_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client can only view their own appointment details.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != str(requesting_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professional can only view their own appointment details.")
    # GESTOR and ATENDENTE can view any appointment in their tenant (already filtered by tenant_id)

    return appointment


# --- Appointment Modification Services (Cancel, Reschedule, Complete, NoShow) ---

def _get_appointment_for_modification(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant
    # Removed allowed_to_modify_roles, direct checks below
) -> Appointment:
    """
    Fetches an appointment and performs initial permission checks for modification.
    This is a stricter version of get_appointment_by_id for write operations.
    """
    # Use the existing get_appointment_by_id which already applies basic view permissions
    # and eager loads relationships.
    appointment = get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)

    if not appointment: # get_appointment_by_id would have raised 403 if view denied, or returns None if not found
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or access denied.")

    # Specific modification permission checks (on top of view permissions)
    can_modify = False
    if requesting_user.role in [UserRole.GESTOR, UserRole.ATENDENTE]:
        can_modify = True
    elif requesting_user.role == UserRole.CLIENTE and appointment.client_id == str(requesting_user.user_id):
        can_modify = True
    elif requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id == str(requesting_user.user_id):
        can_modify = True

    if not can_modify:
        # This case should ideally be caught by get_appointment_by_id if it's strict enough,
        # but double-checking here or adding more granular modification rules.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this appointment.")

    return appointment


def cancel_appointment(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant,
    reason: Optional[str] = None
) -> Appointment:

    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)

    if appointment.status not in [AppointmentStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be cancelled in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.CANCELLED
    original_professional_id = appointment.professional_id # For logging
    original_client_id = appointment.client_id # For logging
    original_date = appointment.appointment_date # For logging

    if reason: # Log reason
        note = f"Cancelled by {requesting_user.role.value} ({requesting_user.email}): {reason}."
        if appointment.notes_by_professional: appointment.notes_by_professional += f"\n{note}"
        else: appointment.notes_by_professional = note

    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user) # Re-fetch with relations


def reschedule_appointment(
    db: Session,
    appointment_id: UUID,
    new_date: date,
    new_start_time: time,
    tenant_id: UUID,
    requesting_user: UserTenant,
    reason: Optional[str] = None
) -> Appointment:

    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)

    original_date = appointment.appointment_date
    original_start_time = appointment.start_time

    if appointment.status not in [AppointmentStatus.SCHEDULED, AppointmentStatus.CANCELLED]: # Allow rescheduling a cancelled appt
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be rescheduled in its current state ('{appointment.status.value}')."
        )

    service = db.get(Service, str(appointment.service_id))  # Convert UUID to string for MySQL compatibility
    if not service:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Associated service data missing.")

    new_end_time = _calculate_end_time(new_start_time, service.duration_minutes)

    # Availability Check (re-using create_appointment's core logic for slot validation)
    # This is a simplified version of the availability check logic from create_appointment
    daily_availability_response = get_daily_time_slots_for_professional(
        db, appointment.professional_id, new_date, tenant_id
    )

    block_size_minutes = _get_tenant_block_size(db, tenant_id)
    current_check_time_dt = datetime.combine(new_date, new_start_time)
    service_end_dt = datetime.combine(new_date, new_end_time)

    required_slots_available = True
    temp_time_dt = current_check_time_dt
    while temp_time_dt < service_end_dt:
        slot_found_and_available = False
        for slot in daily_availability_response.slots:
            if slot.start_time == temp_time_dt.time() and \
               slot.end_time == (temp_time_dt + timedelta(minutes=block_size_minutes)).time():
                # If the blocking appointment is the one we are rescheduling, treat slot as available
                if slot.is_available or (slot.appointment_id == appointment_id):
                    slot_found_and_available = True
                break

        if not slot_found_and_available:
            required_slots_available = False; break
        temp_time_dt += timedelta(minutes=block_size_minutes)

    if not required_slots_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The new selected time slot is not available.")

    appointment.appointment_date = new_date
    appointment.start_time = new_start_time
    appointment.end_time = new_end_time
    appointment.status = AppointmentStatus.SCHEDULED # Rescheduling implies it's active again

    if reason:
        note = f"Rescheduled by {requesting_user.role.value} ({requesting_user.email}): {reason}."
        if appointment.notes_by_professional: appointment.notes_by_professional += f"\n{note}"
        else: appointment.notes_by_professional = note

    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)


# --- Daily Schedule Service ---
def get_daily_schedule_data(db: Session, schedule_date: date, tenant_id: UUID) -> DailyScheduleResponseSchema:
    """
    Fetches the daily schedule for all active professionals in a tenant,
    including their appointments and blocked time slots for a given date.
    """

    # Fetch active professionals for the tenant
    stmt_professionals = select(UserTenant).where(
        UserTenant.tenant_id == str(tenant_id),
        UserTenant.is_active == True,
        UserTenant.role == UserRole.PROFISSIONAL # Ensure only professionals are included
    ).order_by(UserTenant.full_name) # Optional: order professionals by name

    active_professionals = db.execute(stmt_professionals).scalars().all()

    professionals_schedule_list: List[ProfessionalScheduleSchema] = []

    for prof in active_professionals:
        # Fetch appointments for the professional on the given date
        stmt_appts = select(Appointment).where(
            Appointment.professional_id == str(prof.id),
            Appointment.appointment_date == schedule_date,
            Appointment.tenant_id == str(tenant_id) # Should be redundant if professional is correctly filtered by tenant
        ).order_by(Appointment.start_time)

        appointments_for_prof = db.execute(stmt_appts).scalars().all()

        appointment_details: List[AppointmentDetailSchema] = []
        for appt in appointments_for_prof:
            # Manually load client data since relationships are commented out
            client = db.get(UserTenant, appt.client_id) if appt.client_id else None
            service = db.get(Service, appt.service_id) if appt.service_id else None
            
            if not service: # Should not happen if data is consistent
                continue

            # Combine date and time for start_time
            appointment_start_datetime = datetime.combine(appt.appointment_date, appt.start_time)

            # Calculate duration
            appointment_end_datetime = datetime.combine(appt.appointment_date, appt.end_time)
            duration = int((appointment_end_datetime - appointment_start_datetime).total_seconds() / 60)

            # Map single service to List[ServiceTagSchema]
            service_tags = [ServiceTagSchema(id=service.id, name=service.name)] if service else []

            appointment_details.append(
                AppointmentDetailSchema(
                    id=appt.id,
                    client_name=client.full_name if client and client.full_name else (client.email if client else "Cliente Desconhecido"),
                    start_time=appointment_start_datetime,
                    duration_minutes=duration,
                    services=service_tags,
                    status=appt.status.value if isinstance(appt.status, Enum) else str(appt.status) # Handle Enum or string status
                )
            )

        # Fetch blocked slots for the professional on the given date
        stmt_blocks = select(ProfessionalBlockedTime).where(
            ProfessionalBlockedTime.professional_user_id == str(prof.id),
            ProfessionalBlockedTime.blocked_date == schedule_date,
            ProfessionalBlockedTime.tenant_id == str(tenant_id) # Ensure tenant context
        ).order_by(ProfessionalBlockedTime.start_time)

        blocked_slots_for_prof = db.execute(stmt_blocks).scalars().all()

        blocked_slot_details: List[BlockedSlotSchema] = []
        for block in blocked_slots_for_prof:
            if block.block_type == AvailabilityBlockType.DAY_OFF: # Handle full day off
                # Create a single block for the typical working day or a placeholder
                # For simplicity, let's assume a DAY_OFF block means 8 AM to 8 PM for now.
                # This might need refinement based on actual tenant/professional working hours.
                block_start_dt = datetime.combine(schedule_date, time(8,0))
                block_end_dt = datetime.combine(schedule_date, time(20,0))
                block_duration = int((block_end_dt - block_start_dt).total_seconds() / 60)
                blocked_slot_details.append(
                    BlockedSlotSchema(
                        id=block.id,
                        start_time=block_start_dt,
                        duration_minutes=block_duration,
                        reason=block.reason or "Dia de Folga"
                    )
                )
            elif block.start_time and block.end_time: # Regular timed block
                block_start_datetime = datetime.combine(block.blocked_date, block.start_time)
                block_end_datetime = datetime.combine(block.blocked_date, block.end_time)
                duration = int((block_end_datetime - block_start_datetime).total_seconds() / 60)

                if duration > 0 : # only add if valid duration
                    blocked_slot_details.append(
                        BlockedSlotSchema(
                            id=block.id,
                            start_time=block_start_datetime,
                            duration_minutes=duration,
                            reason=block.reason
                        )
                    )

        photo_url_to_send = None
        if prof.photo_path:
            server_host_url = str(settings.SERVER_HOST)
            if not server_host_url.startswith("http://") and not server_host_url.startswith("https://"):
                server_host_url = f"http://{server_host_url}"
            server_host_url = server_host_url.rstrip('/')

            base_url_path_prefix = "/uploads" # Corrected base path as per main.py static mount

            processed_path_segment = prof.photo_path.lstrip('/')

            if processed_path_segment.startswith('public/uploads/'):
                processed_path_segment = processed_path_segment[len('public/uploads/'):]
            elif processed_path_segment.startswith('uploads/'): # Handles cases where 'public/' might be missing but 'uploads/' is present
                processed_path_segment = processed_path_segment[len('uploads/'):]

            processed_path_segment = processed_path_segment.lstrip('/')

            photo_url_to_send = f"{server_host_url}{base_url_path_prefix}/{processed_path_segment}"

        professionals_schedule_list.append(
            ProfessionalScheduleSchema(
                professional_id=prof.id,
                professional_name=prof.full_name or prof.email, # Fallback to email if full_name is not set
                professional_photo_url=photo_url_to_send,
                appointments=appointment_details,
                blocked_slots=blocked_slot_details
            )
        )

    return DailyScheduleResponseSchema(
        date=schedule_date,
        professionals_schedule=professionals_schedule_list
    )


def complete_appointment(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment:
    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)

    if requesting_user.role == UserRole.CLIENTE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients cannot mark appointments as completed.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != str(requesting_user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only complete their own appointments.")

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be completed in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.COMPLETED
    appointment.paid_manually = False # Defaulting as per requirement, assuming payment handled at location.
                                     # This field might need more context in a real payment flow.
    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)


def mark_appointment_as_no_show(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment:
    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)

    if requesting_user.role == UserRole.CLIENTE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients cannot mark appointments as No Show.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != str(requesting_user.user_id):
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only mark their own appointments as No Show.")

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be marked as No Show in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.NO_SHOW
    db.commit()

    # Removed audit logging
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)


def update_appointment_details(
    db: Session,
    appointment_id: UUID,
    update_data: AppointmentUpdate,
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Optional[Appointment]:
    """
    Update appointment details (client info, professional, service, time, notes, status).
    This is a general update function that handles various appointment modifications.
    """
    # Get the appointment and validate permissions
    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)
    
    # Track what changed for audit logging
    changes = []
    
    # Update client_id if provided and valid
    if update_data.client_id is not None:
        # Validate client belongs to tenant
        client = db.query(UserTenant).filter(
            UserTenant.id == str(update_data.client_id),
            UserTenant.tenant_id == str(tenant_id),
            UserTenant.role == UserRole.CLIENTE
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found in this tenant."
            )
        if appointment.client_id != str(update_data.client_id):
            changes.append(f"client_id: {appointment.client_id} -> {update_data.client_id}")
            appointment.client_id = str(update_data.client_id)
    
    # Update professional_id if provided and valid
    if update_data.professional_id is not None:
        # Validate professional belongs to tenant
        professional = db.query(UserTenant).filter(
            UserTenant.id == str(update_data.professional_id),
            UserTenant.tenant_id == str(tenant_id),
            UserTenant.role == UserRole.PROFISSIONAL
        ).first()
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Professional not found in this tenant."
            )
        if appointment.professional_id != str(update_data.professional_id):
            changes.append(f"professional_id: {appointment.professional_id} -> {update_data.professional_id}")
            appointment.professional_id = str(update_data.professional_id)
    
    # Update service_id if provided and valid
    if update_data.service_id is not None:
        # Validate service belongs to tenant
        service = db.query(Service).filter(
            Service.id == str(update_data.service_id),
            Service.tenant_id == str(tenant_id)
        ).first()
        if not service:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service not found in this tenant."
            )
        if appointment.service_id != str(update_data.service_id):
            changes.append(f"service_id: {appointment.service_id} -> {update_data.service_id}")
            appointment.service_id = str(update_data.service_id)
            # Update end time based on new service duration
            appointment.end_time = _calculate_end_time(appointment.start_time, service.duration_minutes)
    
    # Update appointment date if provided
    if update_data.appointment_date is not None:
        if appointment.appointment_date != update_data.appointment_date:
            changes.append(f"appointment_date: {appointment.appointment_date} -> {update_data.appointment_date}")
            appointment.appointment_date = update_data.appointment_date
    
    # Update start time if provided
    if update_data.start_time is not None:
        if appointment.start_time != update_data.start_time:
            changes.append(f"start_time: {appointment.start_time} -> {update_data.start_time}")
            appointment.start_time = update_data.start_time
            # Recalculate end time based on service duration
            # Get current service to calculate duration
            current_service = db.get(Service, str(appointment.service_id))
            if current_service:
                appointment.end_time = _calculate_end_time(appointment.start_time, current_service.duration_minutes)
    
    # Update notes by client if provided
    if update_data.notes_by_client is not None:
        if appointment.notes_by_client != update_data.notes_by_client:
            changes.append(f"notes_by_client updated")
            appointment.notes_by_client = update_data.notes_by_client
    
    # Update notes by professional if provided
    if update_data.notes_by_professional is not None:
        if appointment.notes_by_professional != update_data.notes_by_professional:
            changes.append(f"notes_by_professional updated")
            appointment.notes_by_professional = update_data.notes_by_professional
    
    # Update status if provided (with validation)
    if update_data.status is not None:
        if appointment.status != update_data.status:
            # Validate status transition (add business logic as needed)
            if update_data.status == AppointmentStatus.CANCELLED and appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot cancel a completed or no-show appointment."
                )
            changes.append(f"status: {appointment.status} -> {update_data.status}")
            appointment.status = update_data.status
    
    # Update pricing if provided
    if update_data.price_at_booking is not None:
        if appointment.price_at_booking != update_data.price_at_booking:
            changes.append(f"price_at_booking: {appointment.price_at_booking} -> {update_data.price_at_booking}")
            appointment.price_at_booking = update_data.price_at_booking
    
    # Update paid manually flag if provided
    if update_data.paid_manually is not None:
        if appointment.paid_manually != update_data.paid_manually:
            changes.append(f"paid_manually: {appointment.paid_manually} -> {update_data.paid_manually}")
            appointment.paid_manually = update_data.paid_manually
    
    # Only commit if there were changes
    if changes:
        try:
            db.commit()
            
            # Removed audit logging
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update appointment: {str(e)}"
            )
    
    # Return the updated appointment directly instead of reloading to avoid session issues
    # The appointment object is already updated in memory after commit
    return appointment


def update_appointment_with_multiple_services(
    db: Session,
    appointment_id: UUID,
    update_data: dict,  # Contains services as array of service names
    tenant_id: UUID,
    requesting_user: UserTenant
) -> List[AppointmentSchema]:
    """
    Update appointment to handle multiple services properly.
    Each service gets its own appointment record.
    
    Logic:
    1. Get current appointment and its service
    2. Get all service IDs from service names in update_data
    3. Update the current appointment with the first service
    4. Create new appointments for additional services
    5. Return all appointment records
    """
    
    # Get the existing appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == str(appointment_id),
        Appointment.tenant_id == str(tenant_id)
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found."
        )
    
    # Extract services from update_data
    service_names = update_data.get('services', [])
    if not service_names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one service must be selected."
        )
    
    # Get service objects from names
    from Modules.Services.models import Service
    services = db.query(Service).filter(
        Service.name.in_(service_names),
        Service.tenant_id == str(tenant_id)
    ).all()
    
    if len(services) != len(service_names):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some services were not found."
        )
    
    # Sort services to maintain consistent order
    services = sorted(services, key=lambda s: service_names.index(s.name))
    
    updated_appointments = []
    
    try:
        # Update the existing appointment with the first service
        first_service = services[0]
        
        # Prepare update data for the first appointment (single service)
        single_service_update = {k: v for k, v in update_data.items() if k != 'services'}
        single_service_update['service_id'] = first_service.id
        
        # Convert to AppointmentUpdate schema
        from .schemas import AppointmentUpdate
        appointment_update_schema = AppointmentUpdate(**single_service_update)
        
        # Update the first appointment
        updated_first = update_appointment_details(
            db=db,
            appointment_id=appointment_id,
            update_data=appointment_update_schema,
            tenant_id=tenant_id,
            requesting_user=requesting_user
        )
        updated_appointments.append(updated_first)
        
        # Create new appointments for additional services
        if len(services) > 1:
            for service in services[1:]:
                new_appointment_data = {
                    'client_id': updated_first.client_id,
                    'professional_id': updated_first.professional_id,
                    'service_id': service.id,
                    'appointment_date': updated_first.appointment_date,
                    'start_time': updated_first.start_time,  # Same time initially
                    'notes_by_client': updated_first.notes_by_client
                }
                
                # Convert to AppointmentCreate schema
                from .schemas import AppointmentCreate
                appointment_create_schema = AppointmentCreate(**new_appointment_data)
                
                # Create the new appointment
                new_appointment = create_appointment(
                    db=db,
                    appointment_data=appointment_create_schema,
                    tenant_id=tenant_id,
                    requesting_user=requesting_user
                )
                updated_appointments.append(new_appointment)
        
        return updated_appointments
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update appointment with multiple services: {str(e)}"
        )
