from uuid import uuid4
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Table, UniqueConstraint, Boolean, Text
from sqlalchemy.dialects.mysql import CHAR
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
    Column("service_id", CHAR(36), ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("professional_user_id", CHAR(36), ForeignKey("users_tenant.id", ondelete="CASCADE"), primary_key=True),
    # No explicit tenant_id here as both services and users_tenant are implicitly tenant-scoped.
    # The FKs ensure data integrity within the tenant.
    # Adding a UniqueConstraint to prevent duplicate entries for the same service and professional
    UniqueConstraint('service_id', 'professional_user_id', name='uq_service_professional')
)

class Category(Base):
    __tablename__ = "service_categories"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(100), nullable=False, unique=True)  # Now globally unique in single schema
    display_order = Column(Integer, nullable=False, default=0)
    icon_path = Column(String(255), nullable=True)
    # Keep tenant_id for legacy compatibility but no longer enforce constraints
    tenant_id = Column(CHAR(36), nullable=True, index=True)  # Legacy field, optional

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"

class Service(Base):
    __tablename__ = "services"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), nullable=False)  # Will enforce uniqueness at application level if needed
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    commission_percentage = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Image paths for different hair types
    image_liso = Column(String(255), nullable=True)
    image_ondulado = Column(String(255), nullable=True)
    image_cacheado = Column(String(255), nullable=True)
    image_crespo = Column(String(255), nullable=True)

    category_id = Column(CHAR(36), ForeignKey("service_categories.id"), nullable=False, index=True)
    # Keep tenant_id for legacy compatibility but no longer enforce constraints
    tenant_id = Column(CHAR(36), nullable=True, index=True)  # Legacy field, optional

    category = relationship("Category", back_populates="services")

    # Many-to-many relationship with UserTenant (Professionals)
    professionals = relationship(
        "UserTenant",
        secondary=service_professionals_association,
        back_populates="services_offered"
    )

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}')>"
