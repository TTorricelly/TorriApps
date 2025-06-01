from pydantic import BaseModel, EmailStr
from uuid import UUID
from .models import AdminMasterRole  # Relative import

class AdminMasterUserBase(BaseModel):
    email: EmailStr # Use EmailStr for email validation
    full_name: str | None = None

class AdminMasterUserCreate(AdminMasterUserBase):
    password: str

class AdminMasterUserUpdate(AdminMasterUserBase): # Added for update operations
    password: str | None = None # Password optional on update
    is_active: bool | None = None
    full_name: str | None = None # Allow full_name to be explicitly set to None

class AdminMasterUser(AdminMasterUserBase):
    id: UUID
    role: AdminMasterRole
    is_active: bool

    class Config:
        from_attributes = True
