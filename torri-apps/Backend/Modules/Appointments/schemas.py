from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, time
from decimal import Decimal

# Attempt to import AppointmentStatus, if it fails, we'll use a string.
try:
    from .constants import AppointmentStatus
except ImportError:
    AppointmentStatus = str # Fallback to string if enum not found

# --- Basic Info Schemas ---
class UserTenantBasicInfo(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True

class AppointmentReschedulePayload(BaseModel):
    new_date: date
    new_start_time: time
    reason: Optional[str] = Field(None, max_length=255) # Added max_length from service example

    class Config:
        from_attributes = True

class AppointmentCancelPayload(BaseModel):
    reason: Optional[str] = Field(None, max_length=255) # Added max_length from service example

    class Config:
        from_attributes = True

class ServiceBasicInfo(BaseModel):
    id: UUID
    name: str
    duration_minutes: int

    class Config:
        from_attributes = True

# --- Availability & Slot Schemas ---
class TimeSlot(BaseModel):
    start_time: time
    end_time: time
    is_available: bool
    appointment_id: Optional[UUID] = None # To indicate which appointment blocks the slot

    class Config:
        from_attributes = True

class DatedTimeSlot(BaseModel):
    date: date
    start_time: time
    end_time: time

    class Config:
        from_attributes = True

class ProfessionalDailyAvailabilityResponse(BaseModel):
    date: date
    slots: List[TimeSlot] # Uses the TimeSlot schema already defined

    class Config:
        from_attributes = True

class AvailabilityRequest(BaseModel):
    service_id: UUID
    professional_id: UUID
    year: int
    month: int

    class Config:
        from_attributes = True

class DailyServiceAvailabilityResponse(BaseModel):
    date: date
    available_slots: List[DatedTimeSlot] # Uses the DatedTimeSlot schema defined above

    class Config:
        from_attributes = True

# --- Core Appointment Schemas ---
class AppointmentBase(BaseModel):
    client_id: UUID
    professional_id: UUID
    service_id: UUID
    appointment_date: date
    start_time: time
    notes_by_client: Optional[str] = Field(None, max_length=500)

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    client_id: Optional[UUID] = None
    professional_id: Optional[UUID] = None
    service_id: Optional[UUID] = None
    appointment_date: Optional[date] = None
    start_time: Optional[time] = None
    notes_by_client: Optional[str] = Field(None, max_length=500)
    status: Optional[AppointmentStatus] = None
    price_at_booking: Optional[Decimal] = None
    paid_manually: Optional[bool] = None
    notes_by_professional: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True

class AppointmentSchema(AppointmentBase):
    id: UUID
    tenant_id: UUID
    end_time: time
    status: AppointmentStatus
    price_at_booking: Decimal
    paid_manually: bool
    notes_by_professional: Optional[str] = None
    client: Optional[UserTenantBasicInfo] = None
    professional: Optional[UserTenantBasicInfo] = None
    service: Optional[ServiceBasicInfo] = None

    class Config:
        from_attributes = True

# --- Schemas for Daily Schedule View ---
class ServiceTagSchema(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True

class AppointmentDetailSchema(BaseModel):
    id: UUID
    client_name: str
    start_time: datetime # Using datetime for full timestamp
    duration_minutes: int
    services: List[ServiceTagSchema]
    status: str

    class Config:
        from_attributes = True

class BlockedSlotSchema(BaseModel):
    id: UUID
    start_time: datetime # Using datetime
    duration_minutes: int
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class ProfessionalScheduleSchema(BaseModel):
    professional_id: UUID
    professional_name: str
    professional_photo_url: Optional[str] = None
    appointments: List[AppointmentDetailSchema]
    blocked_slots: List[BlockedSlotSchema]

    class Config:
        from_attributes = True

class DailyScheduleResponseSchema(BaseModel):
    date: date
    professionals_schedule: List[ProfessionalScheduleSchema]

    class Config:
        from_attributes = True
