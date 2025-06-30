from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, time
from decimal import Decimal

# Attempt to import AppointmentStatus, if it fails, we'll use a string.
try:
    from .constants import AppointmentStatus, AppointmentGroupStatus
except ImportError:
    AppointmentStatus = str # Fallback to string if enum not found
    AppointmentGroupStatus = str

# --- Basic Info Schemas ---
class UserBasicInfo(BaseModel): # Renamed from UserTenantBasicInfo
    id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None

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
        json_encoders = {
            time: lambda v: v.strftime('%H:%M') if v else None
        }

class DatedTimeSlot(BaseModel):
    date: date
    start_time: time
    end_time: time

    class Config:
        from_attributes = True
        json_encoders = {
            time: lambda v: v.strftime('%H:%M') if v else None
        }

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
    # tenant_id: UUID # Removed
    end_time: time
    status: AppointmentStatus
    price_at_booking: Decimal
    paid_manually: bool
    notes_by_professional: Optional[str] = None
    client: Optional[UserBasicInfo] = None # Updated type
    professional: Optional[UserBasicInfo] = None # Updated type
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
    # Added new fields
    notes_by_client: Optional[str] = None
    client_email: Optional[str] = None
    client_phone_number: Optional[str] = None  # Added field

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


# --- Multi-Service Wizard Schemas ---

class ServiceInSlot(BaseModel):
    service_id: UUID
    service_name: str
    professional_id: UUID
    professional_name: str
    station_id: Optional[UUID] = None
    station_name: Optional[str] = None
    duration_minutes: int
    price: Decimal

    class Config:
        from_attributes = True

class WizardTimeSlot(BaseModel):
    id: str  # Unique identifier for this slot combination
    start_time: time
    end_time: time
    total_duration_minutes: int
    total_price: Decimal
    execution_type: str  # "parallel" or "sequential"
    services: List[ServiceInSlot]

    class Config:
        from_attributes = True
        json_encoders = {
            time: lambda v: v.strftime('%H:%M') if v else None,
            Decimal: lambda v: float(v)
        }

class MultiServiceAvailabilityRequest(BaseModel):
    service_ids: List[UUID]
    date: date
    professionals_requested: int = Field(default=1, ge=1, le=3)
    professional_ids: Optional[List[UUID]] = None  # Optional specific professional selection

    class Config:
        from_attributes = True

class MultiServiceAvailabilityResponse(BaseModel):
    date: date
    available_slots: List[WizardTimeSlot]

    class Config:
        from_attributes = True

class ProfessionalInfo(BaseModel):
    id: UUID
    full_name: str
    email: str
    photo_path: Optional[str] = None
    services_offered: List[UUID]  # List of service IDs this professional can handle

    class Config:
        from_attributes = True

class AvailableProfessionalsRequest(BaseModel):
    service_ids: List[UUID]
    date: date

    class Config:
        from_attributes = True

class AvailableProfessionalsResponse(BaseModel):
    date: date
    professionals: List[ProfessionalInfo]

    class Config:
        from_attributes = True

class ServiceInBooking(BaseModel):
    service_id: UUID
    professional_id: UUID
    station_id: Optional[UUID] = None
    start_time: time
    end_time: time

    class Config:
        from_attributes = True
        json_encoders = {
            time: lambda v: v.strftime('%H:%M') if v else None
        }

class SelectedSlot(BaseModel):
    start_time: time
    end_time: time
    execution_type: str  # "parallel" or "sequential"
    services: List[ServiceInBooking]

    class Config:
        from_attributes = True
        json_encoders = {
            time: lambda v: v.strftime('%H:%M') if v else None
        }

class MultiServiceBookingRequest(BaseModel):
    client_id: UUID
    date: date
    selected_slot: SelectedSlot
    notes_by_client: Optional[str] = Field(None, max_length=1000)

    class Config:
        from_attributes = True

class AppointmentGroupSchema(BaseModel):
    id: UUID
    client_id: UUID
    total_duration_minutes: int
    total_price: Decimal
    start_time: datetime
    end_time: datetime
    status: AppointmentGroupStatus
    notes_by_client: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client: Optional[UserBasicInfo] = None
    appointments: List[AppointmentSchema] = []

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class MultiServiceBookingResponse(BaseModel):
    appointment_group: AppointmentGroupSchema
    message: str = "Agendamento multisserviço criado com sucesso"

    class Config:
        from_attributes = True


# --- Kanban Board Schemas ---

class AppointmentGroupStatusUpdate(BaseModel):
    status: AppointmentGroupStatus

    class Config:
        from_attributes = True


class WalkInClientData(BaseModel):
    # For new clients
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    # For existing clients
    id: Optional[UUID] = None


class WalkInServiceData(BaseModel):
    id: UUID
    name: Optional[str] = None  # Optional for frontend convenience
    professional_id: Optional[UUID] = None  # For individual professional assignment


class WalkInAppointmentRequest(BaseModel):
    client: WalkInClientData
    services: List[WalkInServiceData]
    professional_id: Optional[UUID] = None  # Optional for backward compatibility


class WalkInAppointmentResponse(BaseModel):
    appointment_group: AppointmentGroupSchema
    message: str = "Walk-in appointment created successfully"

    class Config:
        from_attributes = True


class AddServicesRequest(BaseModel):
    """Request schema for adding services to existing appointment group"""
    services: List[WalkInServiceData]

    class Config:
        from_attributes = True


class AddServicesResponse(BaseModel):
    """Response schema for adding services to existing appointment group"""
    appointment_group: AppointmentGroupSchema
    added_services_count: int
    message: str = "Services added successfully"

    class Config:
        from_attributes = True


class MergedCheckoutRequest(BaseModel):
    group_ids: List[UUID]


class CheckoutService(BaseModel):
    id: str
    name: str
    price: float
    duration_minutes: int
    professional_name: str
    appointment_id: str
    group_id: str


class MergedCheckoutResponse(BaseModel):
    session_id: str
    group_ids: List[str]
    client_name: str
    total_price: float
    total_duration_minutes: int
    services: List[CheckoutService]
    created_at: str

    class Config:
        from_attributes = True


# --- Payment Processing Schemas ---

class AdditionalProduct(BaseModel):
    name: str
    price: Decimal
    quantity: int = 1

    class Config:
        from_attributes = True


class AppointmentPaymentRequest(BaseModel):
    group_ids: List[UUID]
    subtotal: Decimal
    discount_amount: Decimal = 0
    tip_amount: Decimal = 0
    total_amount: Decimal
    payment_method: str  # 'cash', 'debit', 'credit', 'pix'
    additional_products: List[AdditionalProduct] = []

    class Config:
        from_attributes = True


class AppointmentPaymentResponse(BaseModel):
    payment_id: str
    group_ids: List[str]
    total_amount: float
    payment_method: str
    status: str = "completed"
    processed_at: str
    message: str = "Pagamento processado com sucesso"

    class Config:
        from_attributes = True
