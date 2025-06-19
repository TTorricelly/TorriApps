from pydantic import BaseModel, Field, validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID


class AppSettingBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100, example="default_pros_suggested")
    value: str = Field(..., min_length=1, example="2")
    description: Optional[str] = Field(None, max_length=255, example="Default number of professionals suggested for appointments")
    data_type: str = Field(default="string", example="integer")

    @validator('data_type')
    def validate_data_type(cls, v):
        allowed_types = ['string', 'integer', 'boolean', 'decimal']
        if v not in allowed_types:
            raise ValueError(f'data_type must be one of: {", ".join(allowed_types)}')
        return v

    @validator('value')
    def validate_value_for_type(cls, v, values):
        if 'data_type' not in values:
            return v
        
        data_type = values['data_type']
        
        try:
            if data_type == 'integer':
                int(v)
            elif data_type == 'decimal':
                float(v)
            elif data_type == 'boolean':
                if v.lower() not in ('true', 'false', '1', '0', 'yes', 'no', 'on', 'off'):
                    raise ValueError("Boolean value must be true/false, 1/0, yes/no, or on/off")
        except ValueError as e:
            raise ValueError(f'Value "{v}" is not valid for data_type "{data_type}": {str(e)}')
        
        return v


class AppSettingCreate(AppSettingBase):
    pass


class AppSettingUpdate(BaseModel):
    value: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=255)
    data_type: Optional[str] = Field(None)

    @validator('data_type')
    def validate_data_type(cls, v):
        if v is not None:
            allowed_types = ['string', 'integer', 'boolean', 'decimal']
            if v not in allowed_types:
                raise ValueError(f'data_type must be one of: {", ".join(allowed_types)}')
        return v


class AppSettingSchema(AppSettingBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppSettingValueResponse(BaseModel):
    """Response for getting a single setting value with type conversion."""
    key: str
    value: Union[str, int, float, bool]
    data_type: str
    description: Optional[str] = None