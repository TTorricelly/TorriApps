from typing import List, Optional
from uuid import UUID
from datetime import date, time, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload # Added selectinload
from sqlalchemy import select, and_, or_, func, case

from fastapi import HTTPException, status

# Models
from .models import Appointment
from Backend.Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Backend.Modules.Services.models import Service
from Backend.Core.Auth.models import UserTenant
from Backend.Modules.Tenants.models import Tenant

# Schemas
from .schemas import (
    AppointmentCreate, AppointmentSchema, AppointmentUpdate, # AppointmentUpdate is for future use
    TimeSlot, ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    DailyServiceAvailabilityResponse, DatedTimeSlot # For future use
)
from .constants import AppointmentStatus
from Backend.Modules.Availability.constants import DayOfWeek, AvailabilityBlockType # Corrected import path

# Auth & Config
from Backend.Core.Auth.constants import UserRole
from Backend.Config.Settings import settings
from Backend.Core.Audit import log_audit, AuditLogEvent # Import audit logging


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
    tenant = db.get(Tenant, tenant_id)
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
    target_day_of_week = DayOfWeek(target_date.weekday()) # Convert to our DayOfWeek enum

    slots = []

    # 1. Get Professional's recurring availability for that day_of_week
    stmt_avail = select(ProfessionalAvailability).where(
        ProfessionalAvailability.professional_user_id == professional_id,
        ProfessionalAvailability.day_of_week == target_day_of_week,
        ProfessionalAvailability.tenant_id == tenant_id # Ensure it's for the correct tenant context
    ).order_by(ProfessionalAvailability.start_time)
    working_hours_today = db.execute(stmt_avail).scalars().all()

    if not working_hours_today:
        return ProfessionalDailyAvailabilityResponse(date=target_date, slots=[])

    # 2. Get recurring breaks for that day
    stmt_breaks = select(ProfessionalBreak).where(
        ProfessionalBreak.professional_user_id == professional_id,
        ProfessionalBreak.day_of_week == target_day_of_week,
        ProfessionalBreak.tenant_id == tenant_id
    )
    breaks_today = db.execute(stmt_breaks).scalars().all()

    # 3. Get specific date-based blocked times (includes DAY_OFF)
    stmt_blocks = select(ProfessionalBlockedTime).where(
        ProfessionalBlockedTime.professional_user_id == professional_id,
        ProfessionalBlockedTime.block_date == target_date,
        ProfessionalBlockedTime.tenant_id == tenant_id
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
        Appointment.professional_id == professional_id,
        Appointment.appointment_date == target_date,
        Appointment.tenant_id == tenant_id,
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
) -> (UserTenant, UserTenant, Service):

    client = db.get(UserTenant, client_id)
    professional = db.get(UserTenant, professional_id)
    service = db.get(Service, service_id)

    if not (client and client.tenant_id == tenant_id): # Client must exist and belong to the tenant
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found in this tenant.")
    # Role check for client can be done here if UserTenant has a generic role or a specific CLIENT role
    # if client.role != UserRole.CLIENTE: # Assuming CLIENTE role exists
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User specified as client does not have the 'CLIENTE' role.")


    if not (professional and professional.tenant_id == tenant_id and professional.role == UserRole.PROFISSIONAL):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found or invalid role in this tenant.")

    if not (service and service.tenant_id == tenant_id): # Service must exist and belong to the tenant
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found in this tenant.")

    # Validate if the professional offers the service
    if professional not in service.professionals: # Uses the SQLAlchemy relationship
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Professional {professional.full_name or professional.email} does not offer service '{service.name}'."
        )

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
        if requesting_user.id != appointment_data.client_id or requesting_user.role != UserRole.CLIENTE:
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
        client_id=client.id,
        professional_id=professional.id,
        service_id=service.id,
        tenant_id=tenant_id,
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
    db.refresh(db_appointment)

    # Eager load related objects for the response if AppointmentSchema expects them
    # This can be done here or by modifying AppointmentSchema to use selectinload/joinedload by default if always needed.
    # For now, assume schema handles it or it's done in the route if needed for response.
    # To ensure the nested fields are populated in the response as defined in AppointmentSchema:
    db.refresh(db_appointment) # Ensure all attributes are up-to-date

    # Manually trigger loading of relationships if not configured for auto-loading in schema/model
    # This is often better done via options(joinedload(...)) in the query that fetches for response,
    # but since we are returning the created object directly:
    # from sqlalchemy.orm import selectinload # Moved import to top
    stmt_for_response = select(Appointment).where(Appointment.id == db_appointment.id).options(
        selectinload(Appointment.client),
        selectinload(Appointment.professional),
        selectinload(Appointment.service)
    )
    refreshed_appointment_with_relations = db.execute(stmt_for_response).scalar_one()

    log_audit(
        event_type=AuditLogEvent.APPOINTMENT_CREATED,
        requesting_user_id=requesting_user.id,
        tenant_id=tenant_id,
        entity_id=refreshed_appointment_with_relations.id,
        details={
            "client_id": str(refreshed_appointment_with_relations.client_id),
            "professional_id": str(refreshed_appointment_with_relations.professional_id),
            "service_id": str(refreshed_appointment_with_relations.service_id),
            "date": refreshed_appointment_with_relations.appointment_date.isoformat(),
            "start_time": refreshed_appointment_with_relations.start_time.isoformat()
        }
    )
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
    service_obj = db.get(Service, req.service_id)
    if not service_obj or service_obj.tenant_id != tenant_id:
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

    stmt = select(Appointment).where(Appointment.tenant_id == tenant_id)

    # Permission-based filtering
    if requesting_user.role == UserRole.CLIENTE:
        if client_id and client_id != requesting_user.id: # Client trying to query for another client
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients can only view their own appointments.")
        stmt = stmt.where(Appointment.client_id == requesting_user.id)
    elif requesting_user.role == UserRole.PROFISSIONAL:
        if professional_id and professional_id != requesting_user.id: # Prof trying to query for another prof
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only view their own appointments.")
        stmt = stmt.where(Appointment.professional_id == requesting_user.id)
    else: # GESTOR, ATENDENTE can use filters
        if professional_id:
            stmt = stmt.where(Appointment.professional_id == professional_id)
        if client_id:
            stmt = stmt.where(Appointment.client_id == client_id)

    # Optional filters
    if date_from:
        stmt = stmt.where(Appointment.appointment_date >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.appointment_date <= date_to)
    if status:
        stmt = stmt.where(Appointment.status == status)

    stmt = stmt.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).offset(skip).limit(limit)

    # Eager load relationships for response schema
    stmt = stmt.options(
        selectinload(Appointment.client),
        selectinload(Appointment.professional),
        selectinload(Appointment.service)
    )

    appointments = db.execute(stmt).scalars().all()
    return list(appointments)


def get_appointment_by_id(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment | None:

    stmt = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == tenant_id
    ).options(
        selectinload(Appointment.client),
        selectinload(Appointment.professional),
        selectinload(Appointment.service)
    )
    appointment = db.execute(stmt).scalars().first()

    if not appointment:
        return None # Handled as 404 in route

    # Permission check
    if requesting_user.role == UserRole.CLIENTE and appointment.client_id != requesting_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client can only view their own appointment details.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != requesting_user.id:
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
    elif requesting_user.role == UserRole.CLIENTE and appointment.client_id == requesting_user.id:
        can_modify = True
    elif requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id == requesting_user.id:
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
    db.refresh(appointment)

    log_audit(
        event_type=AuditLogEvent.APPOINTMENT_CANCELLED,
        requesting_user_id=requesting_user.id,
        tenant_id=tenant_id,
        entity_id=appointment.id,
        details={
            "reason": reason,
            "original_professional_id": str(original_professional_id),
            "original_client_id": str(original_client_id),
            "original_date": original_date.isoformat()
        }
    )
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

    service = db.get(Service, appointment.service_id)
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
    db.refresh(appointment)

    log_audit(
        event_type=AuditLogEvent.APPOINTMENT_RESCHEDULED,
        requesting_user_id=requesting_user.id,
        tenant_id=tenant_id,
        entity_id=appointment.id,
        details={
            "reason": reason,
            "original_date": original_date.isoformat(),
            "original_start_time": original_start_time.isoformat(),
            "new_date": new_date.isoformat(),
            "new_start_time": new_start_time.isoformat()
        }
    )
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)


def complete_appointment(
    db: Session,
    appointment_id: UUID,
    tenant_id: UUID,
    requesting_user: UserTenant
) -> Appointment:
    appointment = _get_appointment_for_modification(db, appointment_id, tenant_id, requesting_user)

    if requesting_user.role == UserRole.CLIENTE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clients cannot mark appointments as completed.")
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != requesting_user.id:
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
    db.refresh(appointment)

    log_audit(
        event_type=AuditLogEvent.APPOINTMENT_COMPLETED,
        requesting_user_id=requesting_user.id,
        tenant_id=tenant_id,
        entity_id=appointment.id
    )
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
    if requesting_user.role == UserRole.PROFISSIONAL and appointment.professional_id != requesting_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professionals can only mark their own appointments as No Show.")

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be marked as No Show in its current state ('{appointment.status.value}')."
        )

    appointment.status = AppointmentStatus.NOSHOW
    db.commit()
    db.refresh(appointment)

    log_audit(
        event_type=AuditLogEvent.APPOINTMENT_NOSHOW,
        requesting_user_id=requesting_user.id,
        tenant_id=tenant_id,
        entity_id=appointment.id
    )
    return get_appointment_by_id(db, appointment_id, tenant_id, requesting_user)
