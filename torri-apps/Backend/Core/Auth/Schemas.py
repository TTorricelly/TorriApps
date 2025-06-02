from pydantic import BaseModel, EmailStr
from uuid import UUID
from .constants import UserRole

class UserTenantBase(BaseModel):
    email: EmailStr
    full_name: str | None = None

class UserTenantCreate(UserTenantBase):
    password: str
    role: UserRole
    # tenant_id will likely be injected by the service/route based on authenticated user or path parameter
    # For now, not including it here, assuming it's handled during creation contextually.
    # If a scenario requires explicit tenant_id input during creation by AdminMaster, it can be added.

class UserTenantUpdate(BaseModel): # Schema for updating a user
    email: EmailStr | None = None
    full_name: str | None = None
    # Password update should be a separate endpoint/process for security best practices.
    # password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None

class UserTenant(UserTenantBase):
    id: UUID
    role: UserRole
    is_active: bool
    # tenant_id is not typically returned in the UserTenant schema itself,
    # as it's often implicit in the context of the request (e.g., data for a specific tenant).
    # If needed for specific responses, it can be added.

    class Config:
        from_attributes = True

# Schemas for Token Handling
class Token(BaseModel):
    access_token: str
    token_type: str

class EnhancedToken(BaseModel):
    access_token: str
    token_type: str
    tenant_id: UUID

class TokenData(BaseModel):
    # 'sub' (subject) is often the user's email or ID
    # For this application, let's assume 'sub' will store the email.
    sub: EmailStr | None = None
    tenant_id: UUID | None = None
    role: UserRole | None = None
    # Add any other data you want to store in the token payload

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # tenant_id is passed via header X-Tenant-ID, so not in the login body.

class EnhancedLoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: UUID | None = None  # Optional tenant_id for enhanced login
