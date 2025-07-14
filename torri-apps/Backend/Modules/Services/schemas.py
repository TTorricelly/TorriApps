from pydantic import BaseModel, Field, condecimal, field_validator
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
    # Display order field
    display_order: int = Field(default=0, ge=0, example=0, description="Display order for sorting services")
    # Execution order and flexibility fields
    execution_order: int = Field(default=0, ge=0, le=9999, example=0, description="Execution order for appointment scheduling")
    execution_flexible: bool = Field(default=False, example=False, description="True if service execution order can be optimized")
    # Advanced timing fields (all in minutes, nullable)
    processing_time: Optional[int] = Field(None, ge=0, le=600, example=30, description="Processing time where client waits (minutes)")
    finishing_time: Optional[int] = Field(None, ge=0, le=180, example=15, description="Final steps after processing (minutes)")
    transition_time: Optional[int] = Field(None, ge=0, le=60, example=5, description="Setup/cleanup time between services (minutes)")
    # Processing behavior fields
    allows_parallel_during_processing: bool = Field(default=False, example=False, description="Other services can run during this service's processing time")
    can_be_done_during_processing: bool = Field(default=False, example=False, description="This service can run during another's processing time")
    category_id: UUID
    
    @field_validator('processing_time', 'finishing_time')
    @classmethod
    def validate_timing_consistency(cls, v, info):
        """Validate that processing + finishing <= duration"""
        if v is not None and 'duration_minutes' in info.data:
            duration = info.data.get('duration_minutes', 0)
            processing = info.data.get('processing_time') or 0
            finishing = info.data.get('finishing_time') or 0
            
            if processing + finishing > duration:
                raise ValueError('Processing time + finishing time cannot exceed total duration')
        return v

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
    # Display order field
    display_order: Optional[int] = Field(None, ge=0, description="Display order for sorting services")
    # Execution order and flexibility fields
    execution_order: Optional[int] = Field(None, ge=0, le=9999, description="Execution order for appointment scheduling")
    execution_flexible: Optional[bool] = Field(None, description="True if service execution order can be optimized")
    # Advanced timing fields (all in minutes, nullable)
    processing_time: Optional[int] = Field(None, ge=0, le=600, description="Processing time where client waits (minutes)")
    finishing_time: Optional[int] = Field(None, ge=0, le=180, description="Final steps after processing (minutes)")
    transition_time: Optional[int] = Field(None, ge=0, le=60, description="Setup/cleanup time between services (minutes)")
    # Processing behavior fields
    allows_parallel_during_processing: Optional[bool] = Field(None, description="Other services can run during this service's processing time")
    can_be_done_during_processing: Optional[bool] = Field(None, description="This service can run during another's processing time")
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
    multiple_choice: bool = Field(default=False, example=False, description="Whether multiple variations can be selected from this group")

class ServiceVariationGroupCreate(ServiceVariationGroupBase):
    """Schema for creating a new service variation group."""
    service_id: UUID = Field(..., description="ID of the service this group belongs to")

class ServiceVariationGroupUpdate(BaseModel):
    """Schema for updating service variation group."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, example="Hair Length Options")
    multiple_choice: Optional[bool] = Field(None, description="Whether multiple variations can be selected from this group")

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


# --- Service Reorder Schemas ---

class ServiceReorderItem(BaseModel):
    """Schema for a single service reorder item."""
    service_id: UUID = Field(..., description="ID of the service to reorder")
    display_order: int = Field(..., ge=0, description="New display order for the service")

class ServiceReorderRequest(BaseModel):
    """Schema for reordering services."""
    services: List[ServiceReorderItem] = Field(..., description="List of services with their new order")


# --- Service Compatibility Schemas ---

class ServiceCompatibilityBase(BaseModel):
    """Base schema for service compatibility."""
    can_run_parallel: bool = Field(default=False, example=False, description="Whether services can run at the same time")
    parallel_type: str = Field(default='never', example='during_processing_only', description="Type of parallel execution: full_parallel, during_processing_only, never")
    reason: Optional[str] = Field(None, min_length=1, max_length=255, example="same_professional", description="Reason for compatibility rule")
    notes: Optional[str] = Field(None, min_length=1, max_length=1000, example="Both services require the same professional", description="Additional notes")
    
    @field_validator('parallel_type')
    @classmethod
    def validate_parallel_type(cls, v):
        allowed_values = ['full_parallel', 'during_processing_only', 'never']
        if v not in allowed_values:
            raise ValueError(f'parallel_type must be one of: {allowed_values}')
        return v

class ServiceCompatibilityCreate(ServiceCompatibilityBase):
    """Schema for creating service compatibility."""
    service_a_id: UUID = Field(..., description="ID of the first service")
    service_b_id: UUID = Field(..., description="ID of the second service")

class ServiceCompatibilityUpdate(BaseModel):
    """Schema for updating service compatibility."""
    can_run_parallel: Optional[bool] = Field(None, description="Whether services can run at the same time")
    parallel_type: Optional[str] = Field(None, description="Type of parallel execution")
    reason: Optional[str] = Field(None, max_length=255, description="Reason for compatibility rule")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")

class ServiceCompatibilitySchema(ServiceCompatibilityBase):
    """Schema for service compatibility response."""
    id: UUID
    service_a_id: UUID
    service_b_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ServiceCompatibilityMatrixRequest(BaseModel):
    """Schema for updating multiple service compatibility rules."""
    compatibilities: List[ServiceCompatibilityCreate] = Field(..., description="List of compatibility rules to create/update")

class ServiceCompatibilityMatrixResponse(BaseModel):
    """Schema for service compatibility matrix response."""
    matrix: dict = Field(..., description="Compatibility matrix keyed by service IDs")
    services: List[ServiceSchema] = Field(..., description="List of all services in the matrix")

class ExecutionOrderUpdateRequest(BaseModel):
    """Schema for updating service execution order."""
    service_id: UUID = Field(..., description="ID of the service to update")
    execution_order: int = Field(..., ge=0, le=9999, description="New execution order")
    execution_flexible: bool = Field(..., description="Whether service can be flexible in execution")

class BulkExecutionOrderRequest(BaseModel):
    """Schema for bulk updating execution order."""
    updates: List[ExecutionOrderUpdateRequest] = Field(..., description="List of execution order updates")
