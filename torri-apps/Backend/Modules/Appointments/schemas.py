from pydantic import BaseModel, Field, validator, model_validator
from uuid import UUID
from typing import List, Optional
from datetime import date, time
from decimal import Decimal

from .constants import AppointmentStatus

# --- Schemas for related entities (minimal versions for nesting) ---
# These should ideally be imported from their respective schema files for consistency
# For now, defining minimal versions here to keep this subtask focused.

class UserTenantBasicInfo(BaseModel): # For client/professional info in appointment
    id: UUID
    full_name: Optional[str] = None
    email: str # Consider using EmailStr from pydantic

    class Config:
        from_attributes = True

class ServiceBasicInfo(BaseModel): # For service info in appointment
    id: UUID
    name: str
    duration_minutes: int

    class Config:
        from_attributes = True

# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    # client_id will be taken from authenticated user if client is booking,
    # or provided by gestor/atendente if they are booking for a client.
    # For MVP, let's assume client_id is provided in the request payload.
    client_id: UUID
    professional_id: UUID
    service_id: UUID
    appointment_date: date
    start_time: time # Client typically selects this from available slots
    notes_by_client: Optional[str] = Field(None, max_length=500)

class AppointmentCreate(AppointmentBase):
    # end_time and price_at_booking will be determined by the backend service
    pass

class AppointmentUpdate(BaseModel): # For updating existing appointments
    # Only limited fields should be updatable, e.g., rescheduling or adding notes.
    # Status changes (cancel, complete) should be handled by dedicated endpoints/services.
    appointment_date: Optional[date] = None
    start_time: Optional[time] = None # If rescheduling
    notes_by_client: Optional[str] = Field(None, max_length=500)
    notes_by_professional: Optional[str] = Field(None, max_length=500)
    # Perhaps status can be updated here by a GESTOR/PROFISSIONAL, e.g. to CANCELLED/COMPLETED
    # status: Optional[AppointmentStatus] = None
    # paid_manually: Optional[bool] = None

    @model_validator(mode='after')
    def check_at_least_one_value(cls, values):
        if not any(values.model_dump(exclude_unset=True).values()):
            raise ValueError("At least one field must be provided for update")
        return values

class AppointmentSchema(AppointmentBase): # Response schema
    id: UUID
    tenant_id: UUID
    end_time: time
    status: AppointmentStatus
    price_at_booking: Decimal
    paid_manually: bool
    notes_by_professional: Optional[str] = None

    # Include nested representations of related objects
    client: Optional[UserTenantBasicInfo] = None
    professional: Optional[UserTenantBasicInfo] = None
    service: Optional[ServiceBasicInfo] = None

    class Config:
        from_attributes = True


# --- Schemas for Professional Availability Query ---
class TimeSlot(BaseModel):
    start_time: time
    end_time: time
    # 'available' might be too simplistic if we want to show reasons for unavailability (e.g., break, existing appointment)
    # For now, keeping it simple for an MVP.
    # available: bool
    # Instead of 'available:bool', let's provide more context if a slot is "booked" or a "break"
    is_available: bool = True # True if slot is generally within working hours and not a break/blocked time
    # The following would be populated if is_available is False due to an appointment
    appointment_id: Optional[UUID] = None # If slot is taken by an appointment

class ProfessionalDailyAvailabilityResponse(BaseModel):
    date: date
    slots: List[TimeSlot]

# Schema for requesting available slots (input to a service function)
class AvailabilityRequest(BaseModel):
    professional_id: UUID
    service_id: UUID # Needed to determine slot duration
    month: int = Field(..., ge=1, le=12) # Year and Month to check
    year: int = Field(..., ge=2024) # Example: current year or future

# Schema for available slots on a specific day, including service duration
class DatedTimeSlot(BaseModel):
    date: date
    start_time: time
    end_time: time # Calculated end_time based on service duration

class DailyServiceAvailabilityResponse(BaseModel):
    date: date
    available_slots: List[DatedTimeSlot] = []
