from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum # Changed alias for consistency
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship # Added for relationships
from uuid import uuid4
from Config.Database import Base # Adjusted import path
from Config.Settings import settings # Adjusted import path
from .constants import UserRole
# To prevent circular imports with type hinting, we can use string references for relationship models
# or forward references if needed, but for `secondary` argument, the table object itself might be needed
# or its string name "fully.qualified.path:table_object" or just "table_name" if in same metadata.
# from Modules.Services.models import service_professionals_association (This would be circular)

class UserTenant(Base):
    __tablename__ = 'users_tenant'

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    # Keep tenant_id for legacy compatibility but no longer enforce constraints
    tenant_id = Column(CHAR(36), nullable=True, index=True)  # Legacy field, optional
    
    email = Column(String(120), unique=True, index=True, nullable=False)  # Now globally unique
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Photo fields for professionals
    photo_path = Column(String(500), nullable=True)  # Path to uploaded photo file

    # Relationship to services offered by this professional
    # The string "Backend.Modules.Services.models.Service" is a forward reference to the Service model
    # The string "service_professionals_association" refers to the table name defined in Services.models
    # It's crucial that SQLAlchemy can find this table when initializing.
    # This might require the table to be imported or defined before this model is fully processed,
    # or for metadata to be shared/ordered correctly.
    # Using a string for `secondary` assumes it's in the same `Base.metadata`.
    services_offered = relationship(
        "Service",
        secondary="service_professionals_association",
        back_populates="professionals"
    )

    # Relationships to Appointments - temporarily commented out to resolve initialization issues
    # Commented out to avoid circular imports - these relationships cause issues
    # client_appointments = relationship(
    #     "Appointment",
    #     foreign_keys="[Appointment.client_id]", # This tells SQLAlchemy which FK on Appointment model to use
    #     back_populates="client",
    #     cascade="all, delete-orphan"
    # )

    # professional_appointments = relationship(
    #     "Appointment",
    #     foreign_keys="[Appointment.professional_id]", # This tells SQLAlchemy which FK on Appointment model to use
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )

    # Professional-specific relationships - commented out to avoid circular imports
    # Will be added dynamically after models are loaded
    # availability_schedule = relationship(
    #     "ProfessionalAvailability",
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )
    
    # blocked_times = relationship(
    #     "ProfessionalBlockedTime", 
    #     back_populates="professional",
    #     cascade="all, delete-orphan"
    # )
    
    # recurring_breaks = relationship(
    #     "ProfessionalBreak",
    #     back_populates="professional", 
    #     cascade="all, delete-orphan"
    # )

    def __repr__(self):
        return f"<UserTenant(id={self.id}, email='{self.email}', tenant_id='{self.tenant_id}', role='{self.role.value}')>"
