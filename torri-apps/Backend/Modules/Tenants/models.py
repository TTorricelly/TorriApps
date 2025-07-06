"""
Tenant models for multi-tenant architecture.

This module defines the Tenant model that lives in the public schema
and manages tenant information and database schema mapping.
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from Core.Database.base import Base


class Tenant(Base):
    """
    Tenant model for schema-per-tenant multi-tenancy.
    
    This model is stored in the public schema and contains metadata
    about each tenant including their database schema name.
    """
    __tablename__ = "tenants"
    
    # Use public schema explicitly
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, comment="Display name of the tenant")
    slug = Column(String(50), nullable=False, unique=True, index=True, 
                  comment="URL-safe identifier for the tenant")
    
    # Custom domain for domain-based tenant identification
    custom_domain = Column(String(255), nullable=True, unique=True, index=True,
                          comment="Custom domain for this tenant (e.g., tenant1.com.br)")
    
    # Database schema name - typically 'tenant_' + slug
    db_schema_name = Column(String(63), nullable=False, unique=True, index=True,
                           comment="PostgreSQL schema name for this tenant")
    
    # Tenant status and configuration
    is_active = Column(Boolean, default=True, nullable=False)
    max_users = Column(Integer, default=50, nullable=False, 
                      comment="Maximum number of users allowed for this tenant")
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', slug='{self.slug}', schema='{self.db_schema_name}')>"
    
    @property
    def schema_name(self) -> str:
        """Alias for db_schema_name for compatibility."""
        return self.db_schema_name
    
    def to_dict(self) -> dict:
        """Convert tenant to dictionary for API responses."""
        return {
            "id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "custom_domain": self.custom_domain,
            "db_schema_name": self.db_schema_name,
            "is_active": self.is_active,
            "max_users": self.max_users,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }