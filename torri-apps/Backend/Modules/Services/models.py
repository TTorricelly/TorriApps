from uuid import uuid4
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Table, UniqueConstraint, UUID
from sqlalchemy.orm import relationship

# Adjust import paths based on the actual location of this file relative to project root
from Backend.Config.Database import Base # Base for tenant-specific models
from Backend.Config.Settings import settings
# UserRole might not be directly needed in this file, but good to keep if extending logic later
# from Backend.Core.Auth.constants import UserRole

# Association Table for Service <-> Professional (UserTenant with role PROFISSIONAL)
# This table will reside in the tenant's schema.
service_professionals_association = Table(
    "service_professionals_association",
    Base.metadata, # Use tenant-specific Base.metadata
    Column("service_id", UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("professional_user_id", UUID(as_uuid=True), ForeignKey("users_tenant.id", ondelete="CASCADE"), primary_key=True),
    # No explicit tenant_id here as both services and users_tenant are implicitly tenant-scoped.
    # The FKs ensure data integrity within the tenant.
    # Adding a UniqueConstraint to prevent duplicate entries for the same service and professional
    UniqueConstraint('service_id', 'professional_user_id', name='uq_service_professional')
)

class Category(Base):
    __tablename__ = "service_categories"
    # This table will also be in the tenant's schema.

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False)
    # tenant_id here links to the public.tenants table, establishing ownership.
    # This is important if categories were ever to be managed centrally but applied to tenants,
    # but for per-tenant categories, this explicit FK to public.tenants might be redundant IF
    # the entire schema is already tenant-specific.
    # However, if we want a clear link for potential future cross-tenant analysis (by superadmin), it's useful.
    # Let's assume for now that since 'Base' models go into tenant schemas, this FK is for logical clarity
    # or future admin features, rather than for schema separation itself (which is handled by middleware).
    tenant_id = Column(UUID(as_uuid=True),
                       ForeignKey(f"{settings.default_schema_name}.tenants.id", ondelete="CASCADE"),
                       nullable=False,
                       index=True)

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_category_tenant_name'),
    )

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', tenant_id='{self.tenant_id}')>"

class Service(Base):
    __tablename__ = "services"
    # This table will be in the tenant's schema.

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, nullable=False) # Duration in minutes
    price = Column(Numeric(10, 2), nullable=False) # Example: 12345.67
    # commission_percentage stores values like 10.50 for 10.50%
    commission_percentage = Column(Numeric(5, 2), nullable=True)

    category_id = Column(UUID(as_uuid=True), ForeignKey("service_categories.id"), nullable=False, index=True)
    # Similar to Category.tenant_id, this establishes a clear ownership link to the public.tenants table.
    tenant_id = Column(UUID(as_uuid=True),
                       ForeignKey(f"{settings.default_schema_name}.tenants.id", ondelete="CASCADE"),
                       nullable=False,
                       index=True)

    category = relationship("Category", back_populates="services")

    # Many-to-many relationship with UserTenant (Professionals)
    # `UserTenant` model is in `Backend.Core.Auth.models`
    # The string "UserTenant" will be resolved by SQLAlchemy.
    professionals = relationship(
        "UserTenant",
        secondary=service_professionals_association, # The association table object
        back_populates="services_offered" # Matches `services_offered` in UserTenant model
    )

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_service_tenant_name'),
    )

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', tenant_id='{self.tenant_id}')>"
