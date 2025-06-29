from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")
    slug: str = Field(..., min_length=1, max_length=100, description="URL-friendly tenant identifier")
    contact_email: Optional[str] = Field(None, max_length=255, description="Contact email")
    contact_phone: Optional[str] = Field(None, max_length=50, description="Contact phone number")
    description: Optional[str] = Field(None, description="Tenant description")
    is_active: bool = Field(True, description="Whether the tenant is active")


class TenantCreate(TenantBase):
    """Schema for creating a new tenant"""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating a tenant"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TenantSchema(TenantBase):
    """Schema for tenant responses"""
    id: UUID
    db_schema_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """Schema for tenant list responses"""
    tenants: list[TenantSchema]
    total: int


class TenantStatusUpdate(BaseModel):
    """Schema for updating tenant status"""
    is_active: bool