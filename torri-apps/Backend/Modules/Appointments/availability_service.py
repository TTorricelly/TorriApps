from typing import List, Optional
from uuid import UUID
from datetime import date, time, datetime, timedelta
import calendar

from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

# Models
from .models import Appointment
from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Modules.Services.models import Service

# Schemas
from .schemas import (
    TimeSlot, ProfessionalDailyAvailabilityResponse, AvailabilityRequest,
    DailyServiceAvailabilityResponse, DatedTimeSlot
)
from .constants import AppointmentStatus
from Modules.Availability.constants import DayOfWeek, AvailabilityBlockType

# Utils
from .appointment_utils import get_tenant_block_size, calculate_end_time


def get_daily_time_slots_for_professional(
    db: Session,
    professional_id: UUID,
    target_date: date,
    tenant_id: UUID,
    ignore_client_id: Optional[UUID] = None,
    ignore_start_time: Optional[time] = None
) -> ProfessionalDailyAvailabilityResponse:
    """
    Calculates all available and unavailable time slots for a professional on a
    specific date based on their work hours, breaks, existing appointments and
    blocked times.
    If ``ignore_client_id`` is provided, all existing appointments for that
    client on that day (with this professional) are disregarded for availability
    checking. This allows a client to have multiple overlapping appointments
    with the same professional. The ``ignore_start_time`` parameter is not
    used by the filtering logic if ``ignore_client_id`` is present.
    The granularity of slots is determined by ``tenant.block_size_minutes``.
    """
    block_size_minutes = get_tenant_block_size(db, tenant_id)
    
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

    # Check for vacation or sick leave (which effectively block the entire day)
    if any(block.block_type in [AvailabilityBlockType.VACATION, AvailabilityBlockType.SICK_LEAVE] for block in specific_blocks_today):
        # If it's vacation or sick leave, no slots are available
        return ProfessionalDailyAvailabilityResponse(date=target_date, slots=[])


    # 4. Get existing appointments for that day
    stmt_appts = select(Appointment).where(
        Appointment.professional_id == str(professional_id),
        Appointment.appointment_date == target_date,
        Appointment.tenant_id == str(tenant_id),
        Appointment.status.in_([AppointmentStatus.SCHEDULED]) # Only scheduled appointments block time
    )
    appointments_today = db.execute(stmt_appts).scalars().all()

    if ignore_client_id: # Check only for ignore_client_id
        appointments_today = [
            appt for appt in appointments_today
            if not (appt.client_id == str(ignore_client_id)) # Filter if client_id matches
        ]

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

            # Check against specific blocked times (break or other types)
            for sb in specific_blocks_today:
                if sb.block_type in [AvailabilityBlockType.BREAK, AvailabilityBlockType.OTHER]:
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

    block_size_minutes = get_tenant_block_size(db, tenant_id)
    if block_size_minutes <= 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tenant block size not configured correctly.")

    results: List[DailyServiceAvailabilityResponse] = []
    year = req.year
    month = req.month

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
        available_service_slots_for_day = find_contiguous_available_slots(
            raw_slots, service_duration, block_size_minutes, current_date
        )

        if available_service_slots_for_day:
            results.append(DailyServiceAvailabilityResponse(date=current_date, available_slots=available_service_slots_for_day))

    return results


def find_contiguous_available_slots(
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
            service_end_time = calculate_end_time(service_start_time, service_duration)
            
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