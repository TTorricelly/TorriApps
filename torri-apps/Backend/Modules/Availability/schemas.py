from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from typing import Optional
from datetime import time, date # Ensure these are imported from datetime

from .constants import DayOfWeek

# --- ProfessionalAvailability Schemas ---
class ProfessionalAvailabilityBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

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
    # tenant_id: UUID # Removed

    class Config:
        from_attributes = True


# --- ProfessionalBreak Schemas ---
class ProfessionalBreakBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    name: Optional[str] = Field(None, max_length=100, example="Lunch Break")

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
    # tenant_id: UUID # Removed

    class Config:
        from_attributes = True


# --- ProfessionalBlockedTime Schemas ---
class ProfessionalBlockedTimeBase(BaseModel):
    blocked_date: date
    start_time: time
    end_time: time
    block_type: str
    reason: Optional[str] = Field(None, max_length=255, example="Doctor's appointment")


class ProfessionalBlockedTimeCreate(ProfessionalBlockedTimeBase):
    pass

class ProfessionalBlockedTimeSchema(ProfessionalBlockedTimeBase):
    id: UUID
    professional_user_id: UUID
    # tenant_id: UUID # Removed

    class Config:
        from_attributes = True
