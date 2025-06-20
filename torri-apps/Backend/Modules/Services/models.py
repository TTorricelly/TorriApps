from uuid import uuid4
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Table, UniqueConstraint, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

# Adjust import paths based on the actual location of this file relative to project root
from Config.Database import Base # Base for tenant-specific models
from Config.Settings import settings
# UserRole might not be directly needed in this file, but good to keep if extending logic later
# from Core.Auth.constants import UserRole

# Association Table for Service <-> Professional (UserTenant with role PROFISSIONAL)
# This table will reside in the tenant's schema.
service_professionals_association = Table(
    "service_professionals_association",
    Base.metadata, # Use tenant-specific Base.metadata
    Column("service_id", UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("professional_user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    # No explicit tenant_id here as both services and users are implicitly tenant-scoped.
    # The FKs ensure data integrity within the tenant.
    # Adding a UniqueConstraint to prevent duplicate entries for the same service and professional
    UniqueConstraint('service_id', 'professional_user_id', name='uq_service_professional')
)

class Category(Base):
    __tablename__ = "service_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(100), nullable=False, unique=True)  # Now globally unique in single schema
    display_order = Column(Integer, nullable=False, default=0)
    icon_path = Column(String(255), nullable=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=True)  # Keep for database compatibility

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), nullable=False)  # Will enforce uniqueness at application level if needed
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    commission_percentage = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Parallel service execution fields
    parallelable = Column(Boolean, nullable=False, default=False)  # Can run concurrently with other services
    max_parallel_pros = Column(Integer, nullable=False, default=1)  # Max professionals that can work simultaneously
    
    # General service image
    image = Column(String(255), nullable=True)
    
    # Image paths for different hair types
    image_liso = Column(String(255), nullable=True)
    image_ondulado = Column(String(255), nullable=True)
    image_cacheado = Column(String(255), nullable=True)
    image_crespo = Column(String(255), nullable=True)

    category_id = Column(UUID(as_uuid=True), ForeignKey("service_categories.id"), nullable=False, index=True)

    category = relationship("Category", back_populates="services")

    # Many-to-many relationship with User (Professionals) - temporarily disabled to avoid circular imports
    # professionals = relationship(
    #     "Core.Auth.models.User",
    #     secondary=service_professionals_association,
    #     back_populates="services_offered"
    # )

    # appointments = relationship(
    #     "Modules.Appointments.models.Appointment", # String type hint - temporarily disabled
    #     foreign_keys="[Modules.Appointments.models.Appointment.service_id]", # Module path to Appointment model and its service_id
    #     back_populates="service"
    # )

    # Station requirements relationship - temporarily disabled
    # station_requirements = relationship(
    #     "Modules.Stations.models.ServiceStationRequirement",
    #     back_populates="service",
    #     cascade="all, delete-orphan"
    # )

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}')>"
