from uuid import uuid4
from sqlalchemy import (
    Column, String, Integer, Numeric, Date, Time, ForeignKey, Enum, Boolean,
    CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from Config.Database import Base # Base for tenant-specific models
from Config.Settings import settings
from .constants import AppointmentStatus
# UserTenant and Service models are needed for ForeignKey relationships.
# Using string for relationship model names to avoid direct imports if they cause circularity issues,
# but direct import is fine if modules are structured to allow it (e.g. models loaded after all bases).
# from Core.Auth.models import UserTenant
# from Modules.Services.models import Service


class Appointment(Base):
    __tablename__ = "appointments"
    # This table will reside in the tenant's schema.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))

    # ForeignKeys point to users.id for both client and professional
    client_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    professional_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    service_id = Column(CHAR(36), ForeignKey("services.id"), nullable=False, index=True)

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

    __table_args__ = (
        # Time validation handled in application logic. Overlap checks allow the
        # same client to book multiple services at the same time with the same
        # professional.
        CheckConstraint('start_time < end_time', name='cc_appointment_start_before_end'),
    )

    def __repr__(self):
        return f"<Appointment(id={self.id}, date='{self.appointment_date}', start='{self.start_time}', prof_id='{self.professional_id}', status='{self.status.value}')>"
