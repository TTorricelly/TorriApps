from pydantic import BaseModel, Field, condecimal
from uuid import UUID
from typing import List, Optional # Changed from typing import List, UUID
from decimal import Decimal

# Schema for UserTenant (Professional) to be nested in ServiceWithProfessionals response
# This is a simplified version. You might want to import the actual UserTenant schema
# from Core.Auth.Schemas import User as UserSchema # Updated comment
# For now, defining a minimal one here to avoid deeper import complexities in this step.
class UserBaseMinimal(BaseModel): # Renamed from ProfessionalBase. Minimal representation of a user for service listing
    id: UUID
    full_name: Optional[str] = None
    email: str # Using str for email, can use EmailStr if Pydantic's EmailStr is imported

    class Config:
        from_attributes = True


# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Haircuts")
    display_order: int = Field(default=0, ge=0, example=1)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1, max_length=100, example="Manicure/Pedicure")
    display_order: Optional[int] = Field(None, ge=0, example=2)

class CategorySchema(CategoryBase): # Renamed from Category to CategorySchema
    id: UUID
    # tenant_id removed
    icon_path: Optional[str] = None
    icon_url: Optional[str] = None  # Computed field for frontend

    class Config:
        from_attributes = True


# --- Service Schemas ---
class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, example="Men's Classic Haircut")
    description: Optional[str] = Field(None, max_length=5000, example="Classic haircut including wash and style.")
    duration_minutes: int = Field(..., gt=0, example=30) # Duration greater than 0
    price: condecimal(gt=0, max_digits=10, decimal_places=2) = Field(..., example=Decimal("25.00"))
    # Commission percentage: 0.00 to 100.00
    commission_percentage: Optional[condecimal(ge=0, le=100, max_digits=5, decimal_places=2)] = Field(None, example=Decimal("10.50"))
    is_active: bool = Field(default=True, example=True)
    category_id: UUID

class ServiceCreate(ServiceBase):
    # List of professional UUIDs that can perform this service
    professional_ids: Optional[List[UUID]] = Field(default_factory=list, example=[str(UUID(int=1)), str(UUID(int=2))])

class ServiceUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=5000)
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Optional[condecimal(gt=0, max_digits=10, decimal_places=2)] = Field(None)
    commission_percentage: Optional[condecimal(ge=0, le=100, max_digits=5, decimal_places=2)] = Field(None)
    is_active: Optional[bool] = Field(None)
    category_id: Optional[UUID] = None
    # For updating professionals associated with the service
    professional_ids: Optional[List[UUID]] = None # Pass list to replace, or None to not change

class ServiceSchema(ServiceBase): # Renamed from Service to ServiceSchema. Standard service response model
    id: UUID
    # tenant_id removed
    image: Optional[str] = None
    image_liso: Optional[str] = None
    image_ondulado: Optional[str] = None
    image_cacheado: Optional[str] = None
    image_crespo: Optional[str] = None
    category: Optional[CategorySchema] = None # Nested category information (using renamed CategorySchema)

    class Config:
        from_attributes = True

class ServiceWithProfessionalsResponse(ServiceSchema): # For responses that include professionals
    # `professionals` here would ideally be List[UserSchema] from Core.Auth.Schemas
    # Using UserBaseMinimal for now.
    professionals: List[UserBaseMinimal] = Field(default_factory=list) # Updated type

    class Config:
        from_attributes = True
