from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from typing import Optional
from datetime import time, date # Ensure these are imported from datetime

from .constants import DayOfWeek, AvailabilityBlockType

# --- ProfessionalAvailability Schemas ---
class ProfessionalAvailabilityBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

    @model_validator(mode='after')
    def validate_start_end_time(cls, values):
        start, end = values.start_time, values.end_time
        if start and end and start >= end:
            raise ValueError("start_time must be before end_time")
        return values

class ProfessionalAvailabilityCreate(ProfessionalAvailabilityBase):
    pass

class ProfessionalAvailabilitySchema(ProfessionalAvailabilityBase):
    id: UUID
    professional_user_id: UUID
    tenant_id: UUID # Included for completeness, may be omitted in actual responses if contextually clear

    class Config:
        from_attributes = True


# --- ProfessionalBreak Schemas ---
class ProfessionalBreakBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    name: Optional[str] = Field(None, max_length=100, example="Lunch Break")

    @model_validator(mode='after')
    def validate_start_end_time(cls, values):
        start, end = values.start_time, values.end_time
        if start and end and start >= end:
            raise ValueError("start_time must be before end_time")
        return values

class ProfessionalBreakCreate(ProfessionalBreakBase):
    pass

class ProfessionalBreakSchema(ProfessionalBreakBase):
    id: UUID
    professional_user_id: UUID
    tenant_id: UUID

    class Config:
        from_attributes = True


# --- ProfessionalBlockedTime Schemas ---
class ProfessionalBlockedTimeBase(BaseModel):
    block_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    block_type: AvailabilityBlockType
    reason: Optional[str] = Field(None, max_length=255, example="Doctor's appointment")

    @model_validator(mode='after')
    def validate_blocked_time_based_on_type(cls, values):
        block_type, start, end = values.block_type, values.start_time, values.end_time

        if block_type == AvailabilityBlockType.DAY_OFF:
            if start is not None or end is not None:
                raise ValueError("For DAY_OFF, start_time and end_time must be null.")
        elif block_type == AvailabilityBlockType.BLOCKED_SLOT:
            if start is None or end is None:
                raise ValueError("For BLOCKED_SLOT, start_time and end_time are required.")
            if start >= end:
                raise ValueError("For BLOCKED_SLOT, start_time must be before end_time.")
        return values

class ProfessionalBlockedTimeCreate(ProfessionalBlockedTimeBase):
    pass

class ProfessionalBlockedTimeSchema(ProfessionalBlockedTimeBase):
    id: UUID
    professional_user_id: UUID
    tenant_id: UUID

    class Config:
        from_attributes = True
