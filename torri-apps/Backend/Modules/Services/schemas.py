from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional # Changed from typing import List, UUID
from decimal import Decimal

# Schema for UserTenant (Professional) to be nested in ServiceWithProfessionals response
# This is a simplified version. You might want to import the actual UserTenant schema
# from Backend.Core.Auth.Schemas import UserTenant as UserTenantSchema
# For now, defining a minimal one here to avoid deeper import complexities in this step.
class ProfessionalBase(BaseModel): # Minimal representation of a professional for service listing
    id: UUID
    full_name: Optional[str] = None
    email: str # Using str for email, can use EmailStr if Pydantic's EmailStr is imported

    class Config:
        from_attributes = True


# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Haircuts")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1, max_length=100, example="Manicure/Pedicure")

class CategorySchema(CategoryBase): # Renamed from Category to CategorySchema
    id: UUID
    tenant_id: UUID # Included for completeness, though often implicit in tenant context

    class Config:
        from_attributes = True


# --- Service Schemas ---
class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, example="Men's Classic Haircut")
    description: Optional[str] = Field(None, max_length=500, example="Classic haircut including wash and style.")
    duration_minutes: int = Field(..., gt=0, example=30) # Duration greater than 0
    price: Decimal = Field(..., gt=Decimal(0), decimal_places=2, example=Decimal("25.00"))
    # Commission percentage: 0.00 to 100.00
    commission_percentage: Optional[Decimal] = Field(None, ge=Decimal(0), le=Decimal(100), decimal_places=2, example=Decimal("10.50"))
    category_id: UUID

class ServiceCreate(ServiceBase):
    # List of professional UUIDs that can perform this service
    professional_ids: Optional[List[UUID]] = Field(default_factory=list, example=[str(UUID(int=1)), str(UUID(int=2))])

class ServiceUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Optional[Decimal] = Field(None, gt=Decimal(0), decimal_places=2)
    commission_percentage: Optional[Decimal] = Field(None, ge=Decimal(0), le=Decimal(100), decimal_places=2)
    category_id: Optional[UUID] = None
    # For updating professionals associated with the service
    professional_ids: Optional[List[UUID]] = None # Pass list to replace, or None to not change

class ServiceSchema(ServiceBase): # Renamed from Service to ServiceSchema. Standard service response model
    id: UUID
    tenant_id: UUID # Included for completeness
    category: Optional[CategorySchema] = None # Nested category information (using renamed CategorySchema)

    class Config:
        from_attributes = True

class ServiceWithProfessionalsResponse(ServiceSchema): # For responses that include professionals
    # `professionals` here would ideally be List[UserTenantSchema] from Auth.Schemas
    # Using ProfessionalBase for now.
    professionals: List[ProfessionalBase] = Field(default_factory=list)

    class Config:
        from_attributes = True
