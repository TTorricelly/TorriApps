from uuid import uuid4
from sqlalchemy import Column, String, Integer, Enum, Date, Time, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from Config.Database import Base # Base for tenant-specific models
from Config.Settings import settings
# UserTenant import needed for ForeignKey relationships
# from Core.Auth.models import UserTenant # Not strictly needed if using string for relationship

from .constants import DayOfWeek, AvailabilityBlockType

class ProfessionalAvailability(Base):
    __tablename__ = "professional_availability"
    # This table stores recurring weekly availability for professionals.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    professional_user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    day_of_week = Column(Enum(DayOfWeek, values_callable=lambda obj: [e.value for e in obj]), nullable=False) # Monday=0, Sunday=6
    start_time = Column(Time, nullable=False) # Format: HH:MM:SS
    end_time = Column(Time, nullable=False)   # Format: HH:MM:SS

    # Relationship back to UserTenant (Professional)
    # professional = relationship("UserTenant", back_populates="availabilities") # Define 'availabilities' in UserTenant

    __table_args__ = (
        UniqueConstraint('professional_user_id', 'day_of_week', 'start_time', 'end_time', name='uq_prof_avail_day_time_slot'),
        # Consider constraints to ensure start_time < end_time if not handled at app level
    )

    def __repr__(self):
        return f"<ProfessionalAvailability(id={self.id}, prof_id='{self.professional_user_id}', day='{self.day_of_week.name}', start='{self.start_time}', end='{self.end_time}')>"

class ProfessionalBreak(Base):
    __tablename__ = "professional_breaks"
    # This table stores recurring breaks within a professional's availability.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    professional_user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Cross-schema foreign keys are handled at application level for multi-tenant isolation
    tenant_id = Column(CHAR(36), nullable=False, index=True) # This field might be redundant now if users table is global

    day_of_week = Column(Enum(DayOfWeek, values_callable=lambda obj: [e.value for e in obj]), nullable=False) # Monday=0, Sunday=6
    start_time = Column(Time, nullable=False) # Format: HH:MM:SS
    end_time = Column(Time, nullable=False)   # Format: HH:MM:SS
    name = Column(String(100), nullable=True, default="Break") # Optional name, e.g., "Lunch Break"

    # Relationship back to UserTenant (Professional)
    # professional = relationship("UserTenant", back_populates="breaks") # Define 'breaks' in UserTenant

    __table_args__ = (
        UniqueConstraint('professional_user_id', 'day_of_week', 'start_time', 'end_time', name='uq_prof_break_day_time_slot'),
        # Ensure start_time < end_time
    )

    def __repr__(self):
        return f"<ProfessionalBreak(id={self.id}, prof_id='{self.professional_user_id}', day='{self.day_of_week.name}', start='{self.start_time}', end='{self.end_time}')>"

class ProfessionalBlockedTime(Base):
    __tablename__ = "professional_blocked_time"
    # This table stores specific one-off blocked times or entire days off for professionals.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    professional_user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    blocked_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False) # Nullable if block_type is DAY_OFF
    end_time = Column(Time, nullable=False)   # Nullable if block_type is DAY_OFF
    block_type = Column(String(20), nullable=True, default="other")
    reason = Column(String(255), nullable=True) # Optional reason, e.g., "Doctor's appointment", "Public Holiday"

    # Relationship back to UserTenant (Professional)
    # professional = relationship("UserTenant", back_populates="blocked_times") # Define 'blocked_times' in UserTenant

    __table_args__ = (
        UniqueConstraint('professional_user_id', 'blocked_date', 'start_time', 'end_time', 'block_type', name='uq_prof_blocked_date_slot_type'),
        # Add CHECK constraint for start_time/end_time nullability based on block_type if DB supports it,
        # otherwise, this must be validated at the application/schema level.
        # E.g., CHECK ((block_type = 'DAY_OFF' AND start_time IS NULL AND end_time IS NULL) OR
        #              (block_type = 'BLOCKED_SLOT' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
    )

    def __repr__(self):
        return f"<ProfessionalBlockedTime(id={self.id}, prof_id='{self.professional_user_id}', date='{self.blocked_date}', type='{self.block_type}'>"
