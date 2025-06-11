from typing import List
from uuid import UUID
from datetime import date, time, datetime
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select

# Models
from .models import Appointment
from Modules.Availability.models import ProfessionalBlockedTime
from Modules.Services.models import Service
from Core.Auth.models import User # Updated import

# Schemas
from .schemas import (
    DailyScheduleResponseSchema, ProfessionalScheduleSchema, 
    AppointmentDetailSchema, ServiceTagSchema, BlockedSlotSchema
)
from Modules.Availability.constants import AvailabilityBlockType

# Auth & Config
from Core.Auth.constants import UserRole
from Config.Settings import settings


def get_daily_schedule_data(db: Session, schedule_date: date) -> DailyScheduleResponseSchema: # tenant_id parameter removed
    """
    Fetches the daily schedule for all active professionals,
    including their appointments and blocked time slots for a given date.
    """

    # Fetch active professionals
    stmt_professionals = select(User).where( # Changed UserTenant to User
        # UserTenant.tenant_id == str(tenant_id), # Filter removed
        User.is_active == True, # Changed UserTenant to User
        User.role == UserRole.PROFISSIONAL # Ensure only professionals are included. Changed UserTenant to User
    ).order_by(User.full_name) # Optional: order professionals by name. Changed UserTenant to User

    active_professionals = db.execute(stmt_professionals).scalars().all()

    professionals_schedule_list: List[ProfessionalScheduleSchema] = []

    for prof in active_professionals:
        # Fetch appointments for the professional on the given date
        stmt_appts = select(Appointment).where(
            Appointment.professional_id == str(prof.id),
            Appointment.appointment_date == schedule_date
            # Appointment.tenant_id == str(tenant_id) # Filter removed
        ).order_by(Appointment.start_time)

        appointments_for_prof = db.execute(stmt_appts).scalars().all()

        appointment_details: List[AppointmentDetailSchema] = []
        for appt in appointments_for_prof:
            # Manually load client data since relationships are commented out
            client = db.get(User, appt.client_id) if appt.client_id else None # Changed UserTenant to User
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
                    status=appt.status.value if isinstance(appt.status, Enum) else str(appt.status), # Handle Enum or string status
                    notes_by_client=appt.notes_by_client,
                    client_email=client.email if client else None,
                    client_phone_number=client.phone_number if client else None
                )
            )

        # Fetch blocked slots for the professional on the given date
        stmt_blocks = select(ProfessionalBlockedTime).where(
            ProfessionalBlockedTime.professional_user_id == str(prof.id),
            ProfessionalBlockedTime.blocked_date == schedule_date
            # ProfessionalBlockedTime.tenant_id == str(tenant_id) # Filter removed (tenant_id already removed from model)
        ).order_by(ProfessionalBlockedTime.start_time)

        blocked_slots_for_prof = db.execute(stmt_blocks).scalars().all()

        blocked_slot_details: List[BlockedSlotSchema] = []
        for block in blocked_slots_for_prof:
            if block.start_time and block.end_time: # Regular timed block
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