from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, time # Ensure time is imported if used by legacy schemas
from decimal import Decimal # Ensure Decimal is imported if used by legacy schemas

# Attempt to import AppointmentStatus, if it fails, we'll use a string.
try:
    from .constants import AppointmentStatus
except ImportError:
    AppointmentStatus = str # Fallback to string if enum not found

# --- Schemas from existing file (to be preserved if needed elsewhere, or cleaned up later) ---
class UserTenantBasicInfo(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True # Changed from orm_mode for Pydantic v2 compatibility if applicable

class ServiceBasicInfo(BaseModel):
    id: UUID
    name: str
    duration_minutes: int

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    client_id: UUID
    professional_id: UUID
    service_id: UUID
    appointment_date: date
    start_time: time
    notes_by_client: Optional[str] = Field(None, max_length=500)

class AppointmentCreate(AppointmentBase):
    # This schema is used when creating a new appointment.
    # It inherits all fields from AppointmentBase.
    # Add any additional fields specific to creation if necessary.
    # For now, we assume it has the same fields as AppointmentBase.
    pass

class AppointmentUpdate(BaseModel):
    client_id: Optional[UUID] = None
    professional_id: Optional[UUID] = None
    service_id: Optional[UUID] = None
    appointment_date: Optional[date] = None
    start_time: Optional[time] = None
    notes_by_client: Optional[str] = Field(None, max_length=500)
    # Fields from AppointmentSchema that might be updatable
    status: Optional[AppointmentStatus] = None
    price_at_booking: Optional[Decimal] = None # Usually not updated, but depends on business logic
    paid_manually: Optional[bool] = None
    notes_by_professional: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True

class AppointmentSchema(AppointmentBase): # Existing response schema, may need review
    id: UUID
    tenant_id: UUID
    end_time: time
    status: AppointmentStatus # Uses imported or fallback AppointmentStatus
    price_at_booking: Decimal
    paid_manually: bool
    notes_by_professional: Optional[str] = None
    client: Optional[UserTenantBasicInfo] = None
    professional: Optional[UserTenantBasicInfo] = None
    service: Optional[ServiceBasicInfo] = None

    class Config:
        from_attributes = True

# --- New Schemas for Daily Schedule View ---

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
    status: str # As per new requirement, simple string status

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
