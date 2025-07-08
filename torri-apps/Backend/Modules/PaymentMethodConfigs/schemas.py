"""
PaymentMethodConfigs Schemas
Pydantic models for payment method configuration data validation and serialization.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator

from Modules.Payments.models import PaymentMethod


class AccountSummarySchema(BaseModel):
    """Schema for account summary information."""
    
    id: str
    code: str
    name: str
    kind: str
    subtype: Optional[str] = None
    allow_pos_in: bool
    is_active: bool
    
    class Config:
        from_attributes = True


class PaymentMethodConfigSchema(BaseModel):
    """Schema for payment method configuration data."""
    
    id: str
    payment_method: PaymentMethod
    account_code: str
    account_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Related data
    account: Optional[AccountSummarySchema] = None
    
    class Config:
        from_attributes = True


class CreatePaymentMethodConfigRequest(BaseModel):
    """Request schema for creating a payment method configuration."""
    
    payment_method: PaymentMethod = Field(..., description="Payment method to configure")
    account_code: str = Field(..., description="Account code to map to this payment method")
    
    @validator('account_code')
    def validate_account_code(cls, v):
        """Validate account code format."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Account code cannot be empty")
        return v.strip()


class UpdatePaymentMethodConfigRequest(BaseModel):
    """Request schema for updating a payment method configuration."""
    
    account_code: Optional[str] = Field(None, description="New account code")
    is_active: Optional[bool] = Field(None, description="Active status")
    
    @validator('account_code')
    def validate_account_code(cls, v):
        """Validate account code format if provided."""
        if v is not None and len(v.strip()) == 0:
            raise ValueError("Account code cannot be empty")
        return v.strip() if v else v


class PaymentMethodConfigResponse(BaseModel):
    """Response schema for payment method configuration operations."""
    
    config: PaymentMethodConfigSchema
    message: str = "Operation completed successfully"
    
    class Config:
        from_attributes = True


class PaymentMethodConfigListResponse(BaseModel):
    """Response schema for payment method configuration list operations."""
    
    configs: List[PaymentMethodConfigSchema]
    total_count: int
    missing_methods: List[PaymentMethod] = Field(default=[], description="Payment methods without configuration")
    is_complete: bool = Field(description="Whether all required payment methods are configured")
    
    class Config:
        from_attributes = True


class AvailableAccountsResponse(BaseModel):
    """Response schema for available POS accounts."""
    
    accounts: List[AccountSummarySchema]
    total_count: int
    
    class Config:
        from_attributes = True


class PaymentMethodConfigValidation(BaseModel):
    """Schema for configuration validation results."""
    
    is_valid: bool
    errors: List[str] = Field(default=[], description="List of validation errors")
    warnings: List[str] = Field(default=[], description="List of validation warnings")
    missing_methods: List[PaymentMethod] = Field(default=[], description="Missing payment method configurations")
    
    class Config:
        from_attributes = True


class DefaultConfigsRequest(BaseModel):
    """Request schema for resetting to default configurations."""
    
    overwrite_existing: bool = Field(False, description="Whether to overwrite existing configurations")
    preserve_custom: bool = Field(True, description="Whether to preserve custom payment methods")


class BulkUpdateConfigsRequest(BaseModel):
    """Request schema for bulk updating configurations."""
    
    configs: List[CreatePaymentMethodConfigRequest] = Field(..., description="List of configuration updates")
    reset_missing: bool = Field(False, description="Whether to reset missing configs to defaults")


class PaymentMethodAccountMapping(BaseModel):
    """Schema for payment method to account mapping."""
    
    payment_method: PaymentMethod
    account_code: str
    account_name: str
    
    class Config:
        from_attributes = True


class ConfigurationSummaryResponse(BaseModel):
    """Response schema for configuration summary."""
    
    mappings: List[PaymentMethodAccountMapping]
    total_configured: int
    total_required: int
    is_complete: bool
    last_updated: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Validation schemas for specific business rules
class PosAccountValidation(BaseModel):
    """Schema for POS account validation."""
    
    account_code: str
    is_valid: bool
    is_active: bool
    is_pos_enabled: bool
    is_leaf: bool
    errors: List[str] = Field(default=[])
    
    class Config:
        from_attributes = True


class PaymentMethodConfigFilters(BaseModel):
    """Filters for querying payment method configurations."""
    
    payment_method: Optional[PaymentMethod] = Field(None, description="Filter by payment method")
    account_code: Optional[str] = Field(None, description="Filter by account code")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    
    @validator('account_code')
    def validate_account_code(cls, v):
        """Validate account code format if provided."""
        return v.strip() if v else v


# Response schemas for specific endpoints
class ResetDefaultsResponse(BaseModel):
    """Response schema for reset defaults operation."""
    
    configs: List[PaymentMethodConfigSchema]
    created_count: int
    updated_count: int
    message: str
    
    class Config:
        from_attributes = True


class BulkUpdateResponse(BaseModel):
    """Response schema for bulk update operation."""
    
    configs: List[PaymentMethodConfigSchema]
    success_count: int
    error_count: int
    errors: List[str] = Field(default=[])
    
    class Config:
        from_attributes = True