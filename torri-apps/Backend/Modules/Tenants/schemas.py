"""
Tenant schemas for API validation and serialization.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from uuid import UUID
import re


class TenantBase(BaseModel):
    """Base tenant schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Display name of the tenant")
    slug: str = Field(..., min_length=1, max_length=50, description="URL-safe identifier")
    custom_domain: Optional[str] = Field(None, max_length=255, description="Custom domain for this tenant")
    is_active: bool = Field(True, description="Whether the tenant is active")
    max_users: int = Field(50, ge=1, le=1000, description="Maximum number of users allowed")
    
    @validator('slug')
    def validate_slug(cls, v):
        """Validate slug format - only lowercase letters, numbers, hyphens, underscores."""
        if not v:
            raise ValueError('Slug cannot be empty')
        
        # Allow only lowercase letters, numbers, hyphens, underscores
        if not re.match(r'^[a-z0-9_-]+$', v):
            raise ValueError('Slug can only contain lowercase letters, numbers, hyphens, and underscores')
        
        # Cannot start or end with hyphen or underscore
        if v.startswith(('-', '_')) or v.endswith(('-', '_')):
            raise ValueError('Slug cannot start or end with hyphen or underscore')
        
        # Reserved slugs
        reserved_slugs = {'api', 'admin', 'www', 'app', 'auth', 'public', 'health', 'docs', 'openapi'}
        if v.lower() in reserved_slugs:
            raise ValueError(f'Slug "{v}" is reserved and cannot be used')
        
        return v.lower()
    
    @validator('name')
    def validate_name(cls, v):
        """Validate tenant name."""
        if not v or not v.strip():
            raise ValueError('Tenant name cannot be empty or whitespace')
        return v.strip()
    
    @validator('custom_domain')
    def validate_custom_domain(cls, v):
        """Validate custom domain format."""
        if v is None:
            return v
        
        v = v.strip().lower()
        if not v:
            return None
        
        # Basic domain validation
        domain_pattern = re.compile(
            r'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
        )
        
        if not domain_pattern.match(v):
            raise ValueError('Invalid domain format')
        
        # Reserved domains
        reserved_domains = {'localhost', 'example.com', 'test.com', 'vervio.com.br'}
        if v in reserved_domains:
            raise ValueError(f'Domain "{v}" is reserved and cannot be used')
        
        return v


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating an existing tenant."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    custom_domain: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    max_users: Optional[int] = Field(None, ge=1, le=1000)
    
    @validator('name')
    def validate_name(cls, v):
        """Validate tenant name if provided."""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Tenant name cannot be empty or whitespace')
        return v.strip() if v else v
    
    @validator('custom_domain')
    def validate_custom_domain(cls, v):
        """Validate custom domain format if provided."""
        if v is None:
            return v
        
        v = v.strip().lower()
        if not v:
            return None
        
        # Basic domain validation
        domain_pattern = re.compile(
            r'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
        )
        
        if not domain_pattern.match(v):
            raise ValueError('Invalid domain format')
        
        # Reserved domains
        reserved_domains = {'localhost', 'example.com', 'test.com', 'vervio.com.br'}
        if v in reserved_domains:
            raise ValueError(f'Domain "{v}" is reserved and cannot be used')
        
        return v


class TenantSchema(TenantBase):
    """Schema for tenant responses."""
    id: UUID
    db_schema_name: str = Field(..., description="Database schema name for this tenant")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """Response schema for listing tenants."""
    tenants: List[TenantSchema]
    total: int
    page: int
    per_page: int
    
    
class TenantStatsSchema(BaseModel):
    """Schema for tenant statistics."""
    id: UUID
    name: str
    slug: str
    is_active: bool
    user_count: int
    max_users: int
    created_at: datetime
    
    class Config:
        from_attributes = True