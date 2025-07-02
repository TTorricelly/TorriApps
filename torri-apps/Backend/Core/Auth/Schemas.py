from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from .constants import UserRole, HairType, Gender # Import Gender
from datetime import date # Import date
from typing import Optional
import re
from Core.Utils.brazilian_validators import cpf_validator, cep_validator, state_validator

class UserBase(BaseModel): # Renamed from UserTenantBase
    email: EmailStr | None = None
    full_name: str | None = None
    nickname: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    
    # CPF field for Brazilian clients
    cpf: Optional[str] = None
    
    # Address fields for clients
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_cep: Optional[str] = None
    
    # Validators for Brazilian fields
    @field_validator('cpf')
    def validate_cpf(cls, v):
        return cpf_validator(v)
    
    @field_validator('address_cep')
    def validate_cep(cls, v):
        return cep_validator(v)
    
    @field_validator('address_state')
    def validate_state(cls, v):
        return state_validator(v)

class UserCreate(UserBase): # Renamed from UserTenantCreate
    password: str
    role: UserRole

class UserUpdate(BaseModel): # Renamed from UserTenantUpdate
    email: EmailStr | None = None
    full_name: str | None = None
    nickname: Optional[str] = None
    # Password update should be a separate endpoint/process for security best practices.
    # password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    
    # CPF field for Brazilian clients
    cpf: Optional[str] = None
    
    # Address fields for clients
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_cep: Optional[str] = None
    
    # Validators for Brazilian fields
    @field_validator('cpf')
    def validate_cpf(cls, v):
        return cpf_validator(v)
    
    @field_validator('address_cep')
    def validate_cep(cls, v):
        return cep_validator(v)
    
    @field_validator('address_state')
    def validate_state(cls, v):
        return state_validator(v)

# Read-only User schema without strict validators for existing data
class UserRead(BaseModel):
    id: UUID
    email: EmailStr | None = None
    full_name: str | None = None
    nickname: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    role: UserRole
    is_active: bool
    photo_path: Optional[str] = None
    
    # CPF field for Brazilian clients
    cpf: Optional[str] = None
    
    # Address fields for clients
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_cep: Optional[str] = None

    class Config:
        from_attributes = True

# Alias for backward compatibility - points to the read schema
User = UserRead

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
    email: str | None = None
    full_name: str | None = None
    nickname: Optional[str] = None
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
    nickname: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None
    password: str
    date_of_birth: Optional[date] = None
    hair_type: Optional[HairType] = None
    gender: Optional[Gender] = None
    
    # CPF field for Brazilian clients
    cpf: Optional[str] = None
    
    # Address fields for clients
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_cep: Optional[str] = None
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    # Validators for Brazilian fields
    @field_validator('cpf')
    def validate_cpf(cls, v):
        return cpf_validator(v)
    
    @field_validator('address_cep')
    def validate_cep(cls, v):
        return cep_validator(v)
    
    @field_validator('address_state')
    def validate_state(cls, v):
        return state_validator(v)
