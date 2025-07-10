from uuid import uuid4
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Table, UniqueConstraint, Boolean, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

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
    tenant_id = Column(String(36), nullable=True)  # Match database VARCHAR(36)

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), nullable=False)  # Will enforce uniqueness at application level if needed
    service_sku = Column(String(10), nullable=True, unique=True)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    commission_percentage = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Parallel service execution fields
    parallelable = Column(Boolean, nullable=False, default=False)  # Can run concurrently with other services
    max_parallel_pros = Column(Integer, nullable=False, default=1)  # Max professionals that can work simultaneously
    
    # Price evaluation field
    price_subject_to_evaluation = Column(Boolean, nullable=False, default=False)  # Price requires evaluation
    
    # Note: Image fields removed - now handled by ServiceImage model with flexible labeling
    # Old fields: image, image_liso, image_ondulado, image_cacheado, image_crespo

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
    
    # Service images relationship
    images = relationship("ServiceImage", back_populates="service", cascade="all, delete-orphan", order_by="ServiceImage.display_order")
    
    # Service variations relationship
    variation_groups = relationship("ServiceVariationGroup", back_populates="service", cascade="all, delete-orphan", order_by="ServiceVariationGroup.name")

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}')>"


class ServiceImage(Base):
    """
    Service Image model for storing uploaded images with metadata.
    
    Replaces the old static image URL fields (image, image_liso, image_ondulado, etc.)
    with a flexible system that supports unlimited images per service with labels.
    
    Attributes:
        id: Unique identifier (UUID)
        service_id: Reference to the service this image belongs to
        filename: Original filename when uploaded
        file_path: Storage path or URL where the file is stored
        file_size: File size in bytes
        content_type: MIME type (image/jpeg, image/png, etc.)
        alt_text: Alternative text for accessibility
        display_order: Order for displaying images (0 = first)
        is_primary: Whether this is the primary/featured image for the service
        uploaded_by: User who uploaded this image
        created_at: When the image was uploaded
        updated_at: When the image metadata was last updated
    """
    __tablename__ = "service_images"
    __table_args__ = (
        Index('idx_service_images_service_id_display_order', 'service_id', 'display_order'),
        Index('idx_service_images_is_primary', 'is_primary'),
        Index('idx_service_images_created_at', 'created_at'),
    )
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # Foreign keys
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # File metadata
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Storage path/URL
    file_size = Column(Integer, nullable=False)  # Size in bytes
    content_type = Column(String(100), nullable=False)  # MIME type
    
    # Display metadata
    alt_text = Column(Text, nullable=True)  # For accessibility
    display_order = Column(Integer, nullable=False, default=0, index=True)
    is_primary = Column(Boolean, nullable=False, default=False, index=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    service = relationship("Service", back_populates="images")
    # uploaded_by_user = relationship("User", foreign_keys=[uploaded_by])  # Uncomment when User relationship is available
    labels = relationship("ServiceImageLabel", back_populates="image", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ServiceImage(id={self.id}, service_id={self.service_id}, filename='{self.filename}', is_primary={self.is_primary})>"


class ServiceImageLabel(Base):
    """
    Junction table for many-to-many relationship between service images and labels.
    
    Allows each image to have multiple labels (e.g., hair type, style, occasion, etc.)
    and each label to be used on multiple images.
    
    Attributes:
        id: Unique identifier (UUID)
        image_id: Reference to the service image
        label_id: Reference to the label
        created_at: When the label was assigned to the image
    """
    __tablename__ = "service_image_labels"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # Foreign keys
    image_id = Column(UUID(as_uuid=True), ForeignKey("service_images.id", ondelete="CASCADE"), nullable=False, index=True)
    label_id = Column(UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Audit field
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    image = relationship("ServiceImage", back_populates="labels")
    # label = relationship("Label")  # Uncomment when Labels relationship is available
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('image_id', 'label_id', name='uq_service_image_label'),
        Index('idx_service_image_labels_image_id', 'image_id'),
        Index('idx_service_image_labels_label_id', 'label_id'),
    )
    
    def __repr__(self):
        return f"<ServiceImageLabel(image_id={self.image_id}, label_id={self.label_id})>"


class ServiceVariationGroup(Base):
    """
    Service Variation Group entity for grouping related service variations.
    
    Represents a group of variations that can be applied to a service
    (e.g., "Hair Length", "Add-ons", "Styling Options").
    
    Attributes:
        id: Unique identifier (UUID)
        name: Name of the variation group
        service_id: Reference to the service this group belongs to
        created_at: When the group was created
        updated_at: When the group was last updated
    """
    __tablename__ = "service_variation_groups"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # Core fields
    name = Column(String(100), nullable=False)
    
    # Foreign keys
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    service = relationship("Service", back_populates="variation_groups")
    variations = relationship("ServiceVariation", back_populates="group", cascade="all, delete-orphan", order_by="ServiceVariation.display_order")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('service_id', 'name', name='uq_service_variation_group_name'),
        Index('idx_service_variation_groups_service_id', 'service_id'),
    )
    
    def __repr__(self):
        return f"<ServiceVariationGroup(id={self.id}, name='{self.name}', service_id={self.service_id})>"


class ServiceVariation(Base):
    """
    Service Variation entity for individual service variations.
    
    Represents a specific variation option within a variation group
    (e.g., "Long Hair (+15 min, +$5)", "Blow Dry (+20 min, +$10)").
    
    Attributes:
        id: Unique identifier (UUID)
        name: Name of the variation
        price_delta: Price adjustment (can be positive or negative)
        duration_delta: Duration adjustment in minutes (can be positive or negative)
        service_variation_group_id: Reference to the variation group
        created_at: When the variation was created
        updated_at: When the variation was last updated
    """
    __tablename__ = "service_variations"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # Core fields
    name = Column(String(100), nullable=False)
    price_delta = Column(Numeric(10, 2), nullable=False, default=0)
    duration_delta = Column(Integer, nullable=False, default=0)
    display_order = Column(Integer, nullable=False, default=0)
    
    # Price evaluation field
    price_subject_to_evaluation = Column(Boolean, nullable=False, default=False)  # Price requires evaluation
    
    # Foreign keys
    service_variation_group_id = Column(UUID(as_uuid=True), ForeignKey("service_variation_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    group = relationship("ServiceVariationGroup", back_populates="variations")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('service_variation_group_id', 'name', name='uq_service_variation_name'),
        Index('idx_service_variations_group_id', 'service_variation_group_id'),
        Index('idx_service_variations_order', 'service_variation_group_id', 'display_order'),
    )
    
    def __repr__(self):
        return f"<ServiceVariation(id={self.id}, name='{self.name}', price_delta={self.price_delta}, duration_delta={self.duration_delta})>"
