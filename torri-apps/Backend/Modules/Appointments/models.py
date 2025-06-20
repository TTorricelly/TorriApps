from uuid import uuid4
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Date, Time, DateTime, ForeignKey, Enum, Boolean,
    CheckConstraint, UniqueConstraint, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from Config.Database import Base # Base for tenant-specific models
from Config.Settings import settings
from .constants import AppointmentStatus, AppointmentGroupStatus
# UserTenant and Service models are needed for ForeignKey relationships.
# Using string for relationship model names to avoid direct imports if they cause circularity issues,
# but direct import is fine if modules are structured to allow it (e.g. models loaded after all bases).
# from Core.Auth.models import UserTenant
# from Modules.Services.models import Service


class AppointmentGroup(Base):
    """
    Groups multiple appointments together for multi-service bookings.
    Tracks the overall status and metadata for the entire booking.
    """
    __tablename__ = "appointment_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # ForeignKey to the client who booked all services
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Summary information
    total_duration_minutes = Column(Integer, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    
    # Time bounds for the entire group
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    
    # Group status
    status = Column(Enum(AppointmentGroupStatus), default=AppointmentGroupStatus.SCHEDULED, nullable=False, index=True)
    
    # Client notes for the entire booking
    notes_by_client = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    client = relationship("Core.Auth.models.User", foreign_keys=[client_id], back_populates="appointment_groups")
    appointments = relationship("Appointment", back_populates="appointment_group", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AppointmentGroup(id={self.id}, client_id='{self.client_id}', status='{self.status.value}', appointments_count={len(self.appointments) if self.appointments else 0})>"


class Appointment(Base):
    __tablename__ = "appointments"
    # This table will reside in the tenant's schema.

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))

    # ForeignKeys point to users.id for both client and professional
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    professional_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True)
    
    # Optional group for multi-service bookings
    group_id = Column(UUID(as_uuid=True), ForeignKey("appointment_groups.id"), nullable=True, index=True)

    appointment_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False, index=True) # Indexed for quick lookups
    end_time = Column(Time, nullable=False)   # Calculated: start_time + service.duration_minutes

    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.SCHEDULED, index=True)

    # Financials at the time of booking
    price_at_booking = Column(Numeric(10, 2), nullable=False)
    # commission_at_booking = Column(Numeric(5, 2), nullable=True) # If commission can vary per appointment

    paid_manually = Column(Boolean, default=False, nullable=False) # Indicates if payment was handled manually

    notes_by_client = Column(String(500), nullable=True)
    notes_by_professional = Column(String(500), nullable=True) # Notes by professional or salon staff

    # Relationships
    client = relationship("Core.Auth.models.User", foreign_keys=[client_id], back_populates="client_appointments")
    professional = relationship("Core.Auth.models.User", foreign_keys=[professional_id], back_populates="professional_appointments")
    service = relationship("Modules.Services.models.Service", foreign_keys=[service_id], back_populates="appointments")
    appointment_group = relationship("AppointmentGroup", back_populates="appointments")

    __table_args__ = (
        # Time validation handled in application logic. Overlap checks allow the
        # same client to book multiple services at the same time with the same
        # professional.
        CheckConstraint('start_time < end_time', name='cc_appointment_start_before_end'),
    )

    def __repr__(self):
        return f"<Appointment(id={self.id}, date='{self.appointment_date}', start='{self.start_time}', prof_id='{self.professional_id}', status='{self.status.value}')>"
