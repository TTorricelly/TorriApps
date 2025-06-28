from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from .constants import UserRole, HairType, Gender # Import Gender
from datetime import date # Import date
from typing import Optional
import re

class UserBase(BaseModel): # Renamed from UserTenantBase
    email: EmailStr
    full_name: str | None = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    social_provider: Optional[str] = None
    social_id: Optional[str] = None
    profile_picture_url: Optional[str] = None

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
    social_provider: Optional[str] = None
    social_id: Optional[str] = None
    profile_picture_url: Optional[str] = None

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
    email_or_phone: str
    password: str
    # tenant_id was previously passed via header, now removed system-wide.
    
    @field_validator('email_or_phone')
    def validate_email_or_phone(cls, v):
        # Check if it's a valid email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        # Check if it's a valid phone (digits, optional + at start, spaces, dashes, parentheses)
        phone_pattern = r'^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$'
        
        if not (re.match(email_pattern, v) or re.match(phone_pattern, v)):
            raise ValueError('Must be a valid email or phone number')
        return v

# Public Registration Request Schema
class PublicRegistrationRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    password: str
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

# Social Authentication Request Schemas
class SocialAuthRequest(BaseModel):
    provider: str  # 'google' or 'facebook'
    access_token: str  # Token from social provider
    
    @field_validator('provider')
    def validate_provider(cls, v):
        if v not in ['google', 'facebook']:
            raise ValueError('Provider must be either "google" or "facebook"')
        return v

class GoogleAuthRequest(BaseModel):
    id_token: str  # Google ID token
    access_token: str  # Google access token
    
class FacebookAuthRequest(BaseModel):
    access_token: str  # Facebook access token
    user_id: str  # Facebook user ID

# Social User Profile Schema (from provider APIs)
class SocialUserProfile(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    birthday: Optional[str] = None  # Will be parsed to date
    gender: Optional[str] = None
    provider: str
