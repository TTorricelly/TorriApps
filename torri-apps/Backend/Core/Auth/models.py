from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint, Date, DateTime
from sqlalchemy import Enum as SAEnum # Changed alias for consistency
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship # Added for relationships
from sqlalchemy.sql import func
from uuid import uuid4
from Config.Database import Base # Adjusted import path
from Config.Settings import settings # Adjusted import path
from .constants import UserRole, HairType, Gender # Import Gender
# To prevent circular imports with type hinting, we can use string references for relationship models
# or forward references if needed, but for `secondary` argument, the table object itself might be needed
# or its string name "fully.qualified.path:table_object" or just "table_name" if in same metadata.
# from Modules.Services.models import service_professionals_association (This would be circular)

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    email = Column(String(255), unique=True, index=True, nullable=True)  # Allow clients without email
    hashed_password = Column(String(255), nullable=True)  # Match database nullable=True
    role = Column(SAEnum(UserRole), nullable=False)
    full_name = Column(String(255), nullable=True)  # Match database VARCHAR(255)
    phone_number = Column(String(50), nullable=True)  # Match database VARCHAR(50)
    date_of_birth = Column(Date, nullable=True)
    hair_type = Column(SAEnum(HairType), nullable=True)
    gender = Column(SAEnum(Gender), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Photo fields for professionals
    photo_path = Column(String(500), nullable=True)  # Path to uploaded photo file
    
    # Timestamps to match database
    created_at = Column(DateTime, nullable=True, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, server_default=func.now())
    
    # Legacy tenant_id field (nullable for backward compatibility)
    tenant_id = Column(UUID(as_uuid=True), nullable=True)

    # Relationship to services offered by this professional
    # The string "Backend.Modules.Services.models.Service" is a forward reference to the Service model
    # The string "service_professionals_association" refers to the table name defined in Services.models
    # It's crucial that SQLAlchemy can find this table when initializing.
    # This might require the table to be imported or defined before this model is fully processed,
    # or for metadata to be shared/ordered correctly.
    # Using a string for `secondary` assumes it's in the same `Base.metadata`.
    # services_offered = relationship(
    #     "Modules.Services.models.Service",
    #     secondary="service_professionals_association",
    #     back_populates="professionals"
    # )

    # Relationships to Appointments - temporarily disabled to avoid circular imports
    # client_appointments = relationship(
    #     "Modules.Appointments.models.Appointment",  # String type hint
    #     foreign_keys="[Modules.Appointments.models.Appointment.client_id]", # Module path to Appointment model and its client_id
    #     back_populates="client",
    #     cascade="all, delete-orphan" # Added cascade as it's common for appointments
    # )

    # professional_appointments = relationship(
    #     "Modules.Appointments.models.Appointment", # String type hint
    #     foreign_keys="[Modules.Appointments.models.Appointment.professional_id]", # Module path to Appointment model and its professional_id
    #     back_populates="professional",
    #     cascade="all, delete-orphan" # Added cascade
    # )

    # Relationship to AppointmentGroups (multi-service bookings) - temporarily disabled 
    # appointment_groups = relationship(
    #     "Modules.Appointments.models.AppointmentGroup",
    #     foreign_keys="[Modules.Appointments.models.AppointmentGroup.client_id]",
    #     back_populates="client",
    #     cascade="all, delete-orphan"
    # )

    # Relationship to Payments - temporarily disabled to avoid circular imports
    # payments = relationship(
    #     "Modules.Payments.models.Payment",
    #     foreign_keys="[Modules.Payments.models.Payment.client_id]",
    #     back_populates="client",
    #     cascade="all, delete-orphan"
    # )

    # Professional-specific relationships - temporarily disabled to avoid circular imports
    # availability_schedule = relationship(
    #     "Modules.Professionals.models.ProfessionalAvailability",
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )
    
    # blocked_times = relationship(
    #     "Modules.Professionals.models.ProfessionalBlockedTime", 
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )
    
    # recurring_breaks = relationship(
    #     "Modules.Professionals.models.ProfessionalBreak",
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"
