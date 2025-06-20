# Professionals will primarily use the existing UserTenant model from Core.Auth.models
# but we can define additional models for professional-specific functionality

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Table, Boolean, Time, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, time, date
import enum

from Core.Database.base import Base

# Enum for blocked time types
class BlockedTimeType(str, enum.Enum):
    BREAK = "break"
    VACATION = "vacation" 
    SICK_LEAVE = "sick_leave"
    OTHER = "other"

# Enum for days of week
class DayOfWeek(str, enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

# Note: professional-service relationships use the existing service_professionals_association table
# defined in Modules/Services/models.py - no need to redefine it here

# Professional availability schedule
class ProfessionalAvailability(Base):
    __tablename__ = "professional_availability"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    professional_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)  # Match existing column name
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Relationships - temporarily disabled to avoid circular imports
    # professional = relationship("Core.Auth.models.User", foreign_keys=[professional_user_id])

# Professional blocked times (vacations, sick days, etc.)
class ProfessionalBlockedTime(Base):
    __tablename__ = "professional_blocked_time"  # Match existing table name (singular)
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    professional_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)  # Match existing column name
    block_date = Column(Date, nullable=False)  # Match existing column name
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    block_type = Column(String(20), nullable=False, default="BREAK")  # Using string instead of enum for compatibility
    reason = Column(Text, nullable=True)
    
    # Relationships - temporarily disabled to avoid circular imports
    # professional = relationship("Core.Auth.models.User", foreign_keys=[professional_user_id])

# Professional recurring breaks (lunch, coffee break, etc.)
class ProfessionalBreak(Base):
    __tablename__ = "professional_breaks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    professional_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)  # Match existing column name
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    name = Column(String(100), nullable=True)  # Match existing schema (nullable)
    
    # Relationships - temporarily disabled to avoid circular imports
    # professional = relationship("Core.Auth.models.User", foreign_keys=[professional_user_id])