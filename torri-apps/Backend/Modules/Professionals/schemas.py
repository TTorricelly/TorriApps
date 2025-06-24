from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import time, date
from enum import Enum

# Enums for API schemas
class BlockedTimeType(str, Enum):
    BREAK = "break"
    VACATION = "vacation" 
    SICK_LEAVE = "sick_leave"
    OTHER = "other"

class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

# Service schemas (for relationships)
class ServiceBasic(BaseModel):
    id: UUID
    name: str
    category_id: UUID
    
    class Config:
        from_attributes = True

# Professional schemas (extending UserTenant functionality)
class ProfessionalBase(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = None
    is_active: bool = True

class ProfessionalCreate(ProfessionalBase):
    password: str
    phone_number: Optional[str] = None
    role: str = "PROFISSIONAL"  # Fixed role for professionals

class ProfessionalUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None

class Professional(ProfessionalBase):
    id: UUID
    role: str
    phone_number: Optional[str] = None
    services_offered: List[ServiceBasic] = []
    photo_url: Optional[str] = None  # Full URL to the photo file
    
    class Config:
        from_attributes = True

# Availability schemas
class AvailabilityPeriodBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

class AvailabilityPeriodCreate(AvailabilityPeriodBase):
    pass

class AvailabilityPeriodUpdate(BaseModel):
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class AvailabilityPeriod(AvailabilityPeriodBase):
    id: UUID
    professional_user_id: UUID  # Match database column name
    
    class Config:
        from_attributes = True

# Blocked time schemas
class BlockedTimeBase(BaseModel):
    blocked_date: date
    start_time: time
    end_time: time
    block_type: BlockedTimeType = BlockedTimeType.BREAK
    reason: Optional[str] = None

class BlockedTimeCreate(BlockedTimeBase):
    pass

class BlockedTimeUpdate(BaseModel):
    blocked_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    block_type: Optional[BlockedTimeType] = None
    reason: Optional[str] = None

class BlockedTime(BaseModel):
    id: UUID
    professional_user_id: UUID  # Match database column name
    block_date: date  # Match database column name
    start_time: time
    end_time: time
    block_type: str
    reason: Optional[str] = None
    
    class Config:
        from_attributes = True

# Break schemas
class BreakBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    name: str

class BreakCreate(BreakBase):
    pass

class BreakUpdate(BaseModel):
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    name: Optional[str] = None

class Break(BreakBase):
    id: UUID
    professional_user_id: UUID  # Match database column name
    
    class Config:
        from_attributes = True

# Service association schemas
class ServiceAssociationUpdate(BaseModel):
    service_ids: List[UUID] = Field(default_factory=list, description="List of service IDs to associate with the professional")

# Bulk availability update schema
class AvailabilityUpdate(BaseModel):
    monday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    tuesday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    wednesday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    thursday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    friday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    saturday: List[AvailabilityPeriodCreate] = Field(default_factory=list)
    sunday: List[AvailabilityPeriodCreate] = Field(default_factory=list)