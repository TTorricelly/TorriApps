from pydantic import BaseModel, EmailStr
from uuid import UUID
from .constants import UserRole, HairType, Gender # Import Gender
from datetime import date # Import date
from typing import Optional

class UserBase(BaseModel): # Renamed from UserTenantBase
    email: EmailStr
    full_name: str | None = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None

class UserCreate(UserBase): # Renamed from UserTenantCreate
    password: str
    role: UserRole
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None

class UserUpdate(BaseModel): # Renamed from UserTenantUpdate
    email: EmailStr | None = None
    full_name: str | None = None
    # Password update should be a separate endpoint/process for security best practices.
    # password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None

class User(UserBase): # Renamed from UserTenant
    id: UUID
    role: UserRole
    is_active: bool
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    photo_path: Optional[str] = None # Added field

    class Config:
        from_attributes = True

# Schemas for Token Handling
class Token(BaseModel):
    access_token: str
    token_type: str

# TenantInfo schema removed as it was only used by the deleted EnhancedToken
# class TenantInfo(BaseModel):
#     id: UUID
#     name: str
#     slug: str
#     logo_url: str | None = None
#     primary_color: str | None = None
#     block_size_minutes: int = 30

class UserInfo(BaseModel): # This schema might still be useful elsewhere
    id: UUID
    email: str
    full_name: str | None = None
    role: str
    phone_number: Optional[str] = None # Added field

# EnhancedToken schema removed as the /enhanced-login route was deleted
# class EnhancedToken(BaseModel):
#     access_token: str
#     token_type: str
#     tenant_id: UUID
#     tenant: TenantInfo  # Complete tenant data
#     user: UserInfo      # Complete user data

class TokenData(BaseModel): # Represents data to be encoded in the token
    # 'sub' (subject) is often the user's email or ID
    # For this application, let's assume 'sub' will store the email.
    sub: EmailStr | None = None
    # tenant_id removed
    role: UserRole | None = None
    # Add any other data you want to store in the token payload, e.g., user_id

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # tenant_id was previously passed via header, now removed system-wide.

# EnhancedLoginRequest schema removed as the /enhanced-login route was deleted
# class EnhancedLoginRequest(BaseModel): # Consider if this schema is still needed or can be merged/simplified
#     email: EmailStr
#     password: str
#     # tenant_id removed
