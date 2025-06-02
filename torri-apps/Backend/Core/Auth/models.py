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
# from Backend.Modules.Services.models import service_professionals_association (This would be circular)

class UserTenant(Base):
    __tablename__ = 'users_tenant'

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Column(CHAR(36),
                       nullable=False,
                       index=True)  # FK removed: cross-schema reference handled at application level
    
    email = Column(String(120), index=True, nullable=False) # Uniqueness per tenant handled by UniqueConstraint
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    __table_args__ = (UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email'),)

    # Relationship to services offered by this professional
    # The string "Backend.Modules.Services.models.Service" is a forward reference to the Service model
    # The string "service_professionals_association" refers to the table name defined in Services.models
    # It's crucial that SQLAlchemy can find this table when initializing.
    # This might require the table to be imported or defined before this model is fully processed,
    # or for metadata to be shared/ordered correctly.
    # Using a string for `secondary` assumes it's in the same `Base.metadata`.
    services_offered = relationship(
        "Service", # Forward reference to Service model in another module
        secondary="service_professionals_association", # Name of the association table
        back_populates="professionals", # Matches `professionals` in Service model
        # primaryjoin="UserTenant.id == service_professionals_association.c.professional_user_id", # Optional: clarify join if needed
        # secondaryjoin="Service.id == service_professionals_association.c.service_id", # Optional: clarify join if needed
        # foreign_keys="[service_professionals_association.c.professional_user_id]" # Also helps clarify
    )

    # Relationships to Appointments
    # For UserTenant as a client
    client_appointments = relationship(
        "Appointment",
        foreign_keys="[Appointment.client_id]", # String reference to Appointment model + foreign key column
        back_populates="client",
        cascade="all, delete-orphan" # If user is deleted, their appointments as client are removed
    )

    # For UserTenant as a professional
    professional_appointments = relationship(
        "Appointment",
        foreign_keys="[Appointment.professional_id]", # String reference to Appointment model + foreign key column
        back_populates="professional",
        cascade="all, delete-orphan" # If user is deleted, their appointments as professional are removed
    )

    def __repr__(self):
        return f"<UserTenant(id={self.id}, email='{self.email}', tenant_id='{self.tenant_id}', role='{self.role.value}')>"
