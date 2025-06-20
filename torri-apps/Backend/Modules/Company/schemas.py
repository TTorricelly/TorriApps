from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class CompanyCreate(CompanyBase):
    is_active: bool = True


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


class Company(CompanyBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Simplified schema for public endpoints (e.g., mobile app)
class CompanyPublic(BaseModel):
    id: UUID
    name: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True