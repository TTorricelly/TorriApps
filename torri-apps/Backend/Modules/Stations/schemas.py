from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional


# --- StationType Schemas ---
class StationTypeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, example="hair_chair")
    name: str = Field(..., min_length=1, max_length=100, example="Cadeira de Corte")


class StationTypeCreate(StationTypeBase):
    pass


class StationTypeUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class StationTypeSchema(StationTypeBase):
    id: UUID

    class Config:
        from_attributes = True


# --- Station Schemas ---
class StationBase(BaseModel):
    type_id: UUID
    label: str = Field(..., min_length=1, max_length=100, example="Hair Chair #2")
    is_active: bool = Field(default=True, example=True)


class StationCreate(StationBase):
    pass


class StationUpdate(BaseModel):
    type_id: Optional[UUID] = None
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class StationSchema(StationBase):
    id: UUID
    station_type: Optional[StationTypeSchema] = None

    class Config:
        from_attributes = True


# --- ServiceStationRequirement Schemas ---
class ServiceStationRequirementBase(BaseModel):
    service_id: UUID
    station_type_id: UUID
    qty: int = Field(default=1, gt=0, example=1)


class ServiceStationRequirementCreate(ServiceStationRequirementBase):
    pass


class ServiceStationRequirementUpdate(BaseModel):
    qty: Optional[int] = Field(None, gt=0)


class ServiceStationRequirementSchema(ServiceStationRequirementBase):
    service: Optional[dict] = None  # Simplified service info
    station_type: Optional[StationTypeSchema] = None

    class Config:
        from_attributes = True


# --- Extended schemas with relationships ---
class StationTypeWithStations(StationTypeSchema):
    stations: List[StationSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True


class StationWithType(StationSchema):
    station_type: StationTypeSchema

    class Config:
        from_attributes = True