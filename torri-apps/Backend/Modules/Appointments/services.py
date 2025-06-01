from typing import List, Optional
from uuid import UUID
from datetime import date, time, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, case

from fastapi import HTTPException, status

# Models
from .models import Appointment
from Backend.Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Backend.Modules.Services.models import Service
from Backend.Core.Auth.models import UserTenant
from Backend.Config.models import Tenant # Assuming Tenant model is in Config.models or similar

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
    return db_appointment


# Placeholder for get_service_availability_for_professional
# This function would iterate through days in a month, call get_daily_time_slots_for_professional,
# and then further filter those slots to find contiguous blocks that can fit a specific service duration.
def get_service_availability_for_professional(
    db: Session, req: AvailabilityRequest, tenant_id: UUID
) -> List[ProfessionalDailyAvailabilityResponse]: # Placeholder, actual response might be List[DailyServiceAvailabilityResponse]
    # Fetch service to get its duration
    service_obj = db.get(Service, req.service_id)
    if not service_obj or service_obj.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    service_duration = service_obj.duration_minutes

    # This is a simplified response. A real implementation would:
    # 1. Determine number of days in req.month, req.year.
    # 2. Loop each day:
    #    a. Call get_daily_time_slots_for_professional for professional_id, day, tenant_id.
    #    b. Process the returned slots:
    #       i.  Identify consecutive available mini-slots (from block_size_minutes).
    #       ii. Group them to see if they can fit service_duration.
    #       iii.Format into DatedTimeSlot or similar for the DailyServiceAvailabilityResponse.
    # For now, returning empty or a single day's raw slots for placeholder.

    # Example: For the first day of the month (very simplified)
    try:
        first_day_of_month = date(req.year, req.month, 1)
        daily_slots_response = get_daily_time_slots_for_professional(
            db, req.professional_id, first_day_of_month, tenant_id
        )
        # Further processing needed here to make it service-duration aware.
        # This response is just the raw block-sized slots for that day.
        return [daily_slots_response]
    except ValueError: # Invalid date, e.g., month out of range (already handled by Pydantic for req)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month/year for availability check.")

    return [] # Placeholder
