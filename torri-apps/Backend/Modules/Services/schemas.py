from pydantic import BaseModel, Field, condecimal
from uuid import UUID
from typing import List, Optional # Changed from typing import List, UUID
from decimal import Decimal
from datetime import datetime

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
    service_sku: Optional[str] = Field(None, max_length=10, example="SVC-HAIR-001")
    description: Optional[str] = Field(None, max_length=5000, example="Classic haircut including wash and style.")
    duration_minutes: int = Field(..., gt=0, example=30) # Duration greater than 0
    price: condecimal(gt=0, max_digits=10, decimal_places=2) = Field(..., example=Decimal("25.00"))
    # Commission percentage: 0.00 to 100.00
    commission_percentage: Optional[condecimal(ge=0, le=100, max_digits=5, decimal_places=2)] = Field(None, example=Decimal("10.50"))
    is_active: bool = Field(default=True, example=True)
    # Parallel service execution fields
    parallelable: bool = Field(default=False, example=False, description="True if service can run concurrently with other services")
    max_parallel_pros: int = Field(default=1, gt=0, example=1, description="Maximum number of professionals that can work simultaneously")
    # Price evaluation field
    price_subject_to_evaluation: bool = Field(default=False, example=False, description="True if service price requires evaluation")
    category_id: UUID

class ServiceCreate(ServiceBase):
    # List of professional UUIDs that can perform this service
    professional_ids: Optional[List[UUID]] = Field(default_factory=list, example=[str(UUID(int=1)), str(UUID(int=2))])

class ServiceUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    service_sku: Optional[str] = Field(None, max_length=10, example="SVC-HAIR-001")
    description: Optional[str] = Field(None, max_length=5000)
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Optional[condecimal(gt=0, max_digits=10, decimal_places=2)] = Field(None)
    commission_percentage: Optional[condecimal(ge=0, le=100, max_digits=5, decimal_places=2)] = Field(None)
    is_active: Optional[bool] = Field(None)
    # Parallel service execution fields
    parallelable: Optional[bool] = Field(None, description="True if service can run concurrently with other services")
    max_parallel_pros: Optional[int] = Field(None, gt=0, description="Maximum number of professionals that can work simultaneously")
    # Price evaluation field
    price_subject_to_evaluation: Optional[bool] = Field(None, description="True if service price requires evaluation")
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


# Service Image Schemas

class ServiceImageBase(BaseModel):
    """Base schema for service image data."""
    alt_text: Optional[str] = Field(None, description="Alternative text for accessibility")
    display_order: int = Field(default=0, description="Display order (0 = first)")
    is_primary: bool = Field(default=False, description="Whether this is the primary image")


class ServiceImageCreate(ServiceImageBase):
    """Schema for creating a new service image (metadata only, file handled separately)."""
    pass


class ServiceImageUpdate(BaseModel):
    """Schema for updating service image metadata."""
    alt_text: Optional[str] = Field(None, description="Alternative text for accessibility")
    display_order: Optional[int] = Field(None, description="Display order (0 = first)")
    is_primary: Optional[bool] = Field(None, description="Whether this is the primary image")


class ServiceImageLabelSchema(BaseModel):
    """Schema for service image label assignments."""
    id: UUID
    label_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class ServiceImageSchema(ServiceImageBase):
    """Schema for service image response data."""
    id: UUID
    service_id: UUID
    filename: str
    file_path: str
    file_size: int
    content_type: str
    created_at: datetime
    updated_at: datetime
    labels: List[ServiceImageLabelSchema] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class ServiceWithProfessionalsResponse(ServiceSchema): # For responses that include professionals
    # `professionals` here would ideally be List[UserSchema] from Core.Auth.Schemas
    # Using UserBaseMinimal for now.
    professionals: List[UserBaseMinimal] = Field(default_factory=list) # Updated type
    images: List[ServiceImageSchema] = Field(default_factory=list, description="Service images ordered by display_order")

    class Config:
        from_attributes = True


class ImageOrderItem(BaseModel):
    """Schema for a single image order item in reorder request."""
    image_id: str = Field(..., description="ID of the image to reorder")
    display_order: int = Field(..., ge=0, description="New display order for the image")




class ServiceWithImagesResponse(ServiceSchema):
    """Service response schema that includes images."""
    images: List[ServiceImageSchema] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


# --- Service Variation Schemas ---

class ServiceVariationGroupBase(BaseModel):
    """Base schema for service variation group."""
    name: str = Field(..., min_length=1, max_length=100, example="Hair Length")

class ServiceVariationGroupCreate(ServiceVariationGroupBase):
    """Schema for creating a new service variation group."""
    service_id: UUID = Field(..., description="ID of the service this group belongs to")

class ServiceVariationGroupUpdate(BaseModel):
    """Schema for updating service variation group."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, example="Hair Length Options")

class ServiceVariationGroupSchema(ServiceVariationGroupBase):
    """Schema for service variation group response."""
    id: UUID
    service_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ServiceVariationBase(BaseModel):
    """Base schema for service variation."""
    name: str = Field(..., min_length=1, max_length=100, example="Long Hair")
    price_delta: condecimal(max_digits=10, decimal_places=2) = Field(default=Decimal("0.00"), example=Decimal("5.00"), description="Price adjustment (can be positive or negative)")
    duration_delta: int = Field(default=0, example=15, description="Duration adjustment in minutes (can be positive or negative)")
    display_order: int = Field(default=0, ge=0, example=0, description="Display order for sorting variations")
    # Price evaluation field
    price_subject_to_evaluation: bool = Field(default=False, example=False, description="True if variation price requires evaluation")

class ServiceVariationCreate(ServiceVariationBase):
    """Schema for creating a new service variation."""
    service_variation_group_id: UUID = Field(..., description="ID of the variation group this variation belongs to")

class ServiceVariationUpdate(BaseModel):
    """Schema for updating service variation."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, example="Extra Long Hair")
    price_delta: Optional[condecimal(max_digits=10, decimal_places=2)] = Field(None, example=Decimal("7.50"))
    duration_delta: Optional[int] = Field(None, example=20)
    display_order: Optional[int] = Field(None, ge=0, example=1, description="Display order for sorting variations")
    # Price evaluation field
    price_subject_to_evaluation: Optional[bool] = Field(None, description="True if variation price requires evaluation")

class ServiceVariationSchema(ServiceVariationBase):
    """Schema for service variation response."""
    id: UUID
    service_variation_group_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# --- Nested Response Schemas ---

class ServiceVariationGroupWithVariationsSchema(ServiceVariationGroupSchema):
    """Service variation group schema with nested variations."""
    variations: List[ServiceVariationSchema] = Field(default_factory=list)
    
    class Config:
        from_attributes = True

class ServiceVariationWithGroupSchema(ServiceVariationSchema):
    """Service variation schema with nested group information."""
    group: ServiceVariationGroupSchema
    
    class Config:
        from_attributes = True


# --- Batch Operation Schemas ---

class VariationReorderItem(BaseModel):
    """Schema for a single variation reorder item."""
    variation_id: UUID = Field(..., description="ID of the variation to reorder")
    display_order: int = Field(..., ge=0, description="New display order for the variation")

class VariationReorderRequest(BaseModel):
    """Schema for reordering variations within a group."""
    variations: List[VariationReorderItem] = Field(..., description="List of variations with their new order")

class BatchVariationUpdate(BaseModel):
    """Schema for batch updating multiple variations."""
    variation_ids: List[UUID] = Field(..., description="List of variation IDs to update")
    updates: ServiceVariationUpdate = Field(..., description="Fields to update for all selected variations")

class BatchVariationDelete(BaseModel):
    """Schema for batch deleting multiple variations."""
    variation_ids: List[UUID] = Field(..., description="List of variation IDs to delete")

class BatchOperationResponse(BaseModel):
    """Schema for batch operation response."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[str] = Field(default_factory=list, description="List of error messages for failed operations")


# --- Extended Service Schemas ---

class ServiceWithVariationsResponse(ServiceSchema):
    """Service response schema that includes variation groups and variations."""
    variation_groups: List[ServiceVariationGroupWithVariationsSchema] = Field(default_factory=list)
    
    class Config:
        from_attributes = True

class ServiceCompleteResponse(ServiceSchema):
    """Complete service response schema with images, professionals, and variations."""
    professionals: List[UserBaseMinimal] = Field(default_factory=list)
    images: List[ServiceImageSchema] = Field(default_factory=list)
    variation_groups: List[ServiceVariationGroupWithVariationsSchema] = Field(default_factory=list)
    
    class Config:
        from_attributes = True
