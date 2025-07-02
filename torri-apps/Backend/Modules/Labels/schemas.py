"""
Labels Module Schemas

This module defines the Pydantic schemas for request/response validation
and serialization for the Labels API endpoints.
"""

from pydantic import BaseModel, Field, validator
from uuid import UUID
from datetime import datetime
from typing import Optional
import re


class LabelBase(BaseModel):
    """Base schema for label data."""
    name: str = Field(..., min_length=1, max_length=100, description="Label name")
    description: Optional[str] = Field(None, description="Optional description of the label")
    color: str = Field(default='#00BFFF', description="Hex color code for the label")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate label name."""
        if not v or not v.strip():
            raise ValueError('Label name cannot be empty')
        return v.strip()
    
    @validator('color')
    def validate_color(cls, v):
        """Validate hex color format."""
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #FF5733)')
        return v.upper()


class LabelCreate(LabelBase):
    """Schema for creating a new label."""
    pass


class LabelUpdate(BaseModel):
    """Schema for updating an existing label."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Label name")
    description: Optional[str] = Field(None, description="Optional description of the label")
    color: Optional[str] = Field(None, description="Hex color code for the label")
    is_active: Optional[bool] = Field(None, description="Whether the label is active")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate label name if provided."""
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Label name cannot be empty')
            return v.strip()
        return v
    
    @validator('color')
    def validate_color(cls, v):
        """Validate hex color format if provided."""
        if v is not None:
            if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
                raise ValueError('Color must be a valid hex color code (e.g., #FF5733)')
            return v.upper()
        return v


class LabelSchema(LabelBase):
    """Schema for label response data."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LabelListResponse(BaseModel):
    """Schema for paginated label list response."""
    items: list[LabelSchema]
    total: int
    page: int
    size: int
    pages: int