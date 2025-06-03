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
    # This table will also be in the tenant's schema.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(100), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    icon_path = Column(String(255), nullable=True)
    # tenant_id links to the public.tenants table, establishing ownership.
    # Cross-schema foreign keys are handled at application level for multi-tenant isolation
    tenant_id = Column(CHAR(36), nullable=False, index=True)

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_category_tenant_name'),
    )

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', tenant_id='{self.tenant_id}')>"

class Service(Base):
    __tablename__ = "services"
    # This table will be in the tenant's schema.

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)  # Changed to Text for rich content
    duration_minutes = Column(Integer, nullable=False) # Duration in minutes
    price = Column(Numeric(10, 2), nullable=False) # Example: 12345.67
    # commission_percentage stores values like 10.50 for 10.50%
    commission_percentage = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Image paths for different hair types
    image_liso = Column(String(255), nullable=True)
    image_ondulado = Column(String(255), nullable=True)
    image_cacheado = Column(String(255), nullable=True)
    image_crespo = Column(String(255), nullable=True)

    category_id = Column(CHAR(36), ForeignKey("service_categories.id"), nullable=False, index=True)
    # tenant_id links to the public.tenants table, establishing ownership.
    # Cross-schema foreign keys are handled at application level for multi-tenant isolation
    tenant_id = Column(CHAR(36), nullable=False, index=True)

    category = relationship("Category", back_populates="services")

    # Many-to-many relationship with UserTenant (Professionals)
    # Temporarily commented out to resolve initialization issues
    # professionals = relationship(
    #     "UserTenant",
    #     secondary=service_professionals_association,
    #     back_populates="services_offered"
    # )

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_service_tenant_name'),
    )

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', tenant_id='{self.tenant_id}')>"
