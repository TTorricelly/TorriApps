from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Annotated
from uuid import UUID

from Core.Database.dependencies import get_db
from .models import StationType, Station, ServiceStationRequirement
from .schemas import (
    StationTypeSchema, StationTypeCreate, StationTypeUpdate,
    StationSchema, StationCreate, StationUpdate,
    ServiceStationRequirementSchema, ServiceStationRequirementCreate, ServiceStationRequirementUpdate,
    StationTypeWithStations, StationWithType
)

router = APIRouter(tags=["stations"])


# --- StationType Routes ---
@router.get("/types", response_model=List[StationTypeSchema])
async def get_station_types(
    db: Session = Depends(get_db)
):
    """Get all station types."""
    return db.query(StationType).all()


def generate_code_from_name(name: str) -> str:
    """Generate a code from the station type name."""
    import re
    # Convert to lowercase, replace spaces and special chars with underscores
    code = re.sub(r'[^a-z0-9]+', '_', name.lower().strip())
    # Remove leading/trailing underscores and multiple consecutive underscores
    code = re.sub(r'^_+|_+$', '', code)
    code = re.sub(r'_+', '_', code)
    return code


@router.post("/types", response_model=StationTypeSchema)
async def create_station_type(
    station_type_data: StationTypeCreate,
    db: Session = Depends(get_db)
):
    """Create a new station type."""
    # Auto-generate code from name if not provided
    if not hasattr(station_type_data, 'code') or not station_type_data.code:
        base_code = generate_code_from_name(station_type_data.name)
        code = base_code
        counter = 1
        
        # Ensure uniqueness by adding number suffix if needed
        while db.query(StationType).filter(StationType.code == code).first():
            code = f"{base_code}_{counter}"
            counter += 1
    else:
        code = station_type_data.code
        # Check if code already exists
        existing = db.query(StationType).filter(StationType.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Station type with this code already exists")
    
    # Create station type with generated/provided code
    station_type_dict = station_type_data.model_dump()
    station_type_dict['code'] = code
    station_type = StationType(**station_type_dict)
    db.add(station_type)
    db.commit()
    db.refresh(station_type)
    return station_type


@router.get("/types/{station_type_id}", response_model=StationTypeWithStations)
async def get_station_type(
    station_type_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a station type by ID with its stations."""
    station_type = db.query(StationType).filter(StationType.id == str(station_type_id)).first()
    if not station_type:
        raise HTTPException(status_code=404, detail="Station type not found")
    return station_type


@router.put("/types/{station_type_id}", response_model=StationTypeSchema)
async def update_station_type(
    station_type_id: UUID,
    station_type_data: StationTypeUpdate,
    db: Session = Depends(get_db)
):
    """Update a station type."""
    station_type = db.query(StationType).filter(StationType.id == str(station_type_id)).first()
    if not station_type:
        raise HTTPException(status_code=404, detail="Station type not found")
    
    update_data = station_type_data.model_dump(exclude_unset=True)
    
    # If name is being updated, regenerate code
    if 'name' in update_data:
        base_code = generate_code_from_name(update_data['name'])
        code = base_code
        counter = 1
        
        # Ensure uniqueness by adding number suffix if needed (exclude current record)
        while True:
            existing = db.query(StationType).filter(
                and_(
                    StationType.code == code,
                    StationType.id != str(station_type_id)
                )
            ).first()
            if not existing:
                break
            code = f"{base_code}_{counter}"
            counter += 1
        
        update_data['code'] = code
    
    # Update fields
    for field, value in update_data.items():
        setattr(station_type, field, value)
    
    db.commit()
    db.refresh(station_type)
    return station_type


@router.delete("/types/{station_type_id}")
async def delete_station_type(
    station_type_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a station type."""
    station_type = db.query(StationType).filter(StationType.id == str(station_type_id)).first()
    if not station_type:
        raise HTTPException(status_code=404, detail="Station type not found")
    
    # Check if there are associated stations
    stations_count = db.query(Station).filter(Station.type_id == str(station_type_id)).count()
    if stations_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete station type. {stations_count} station(s) are using this type."
        )
    
    db.delete(station_type)
    db.commit()
    return {"message": "Station type deleted successfully"}


# --- Station Routes ---
@router.get("", response_model=List[StationWithType])
async def get_stations(
    type_id: Optional[UUID] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all stations, optionally filtered by type and active status."""
    query = db.query(Station)
    
    if type_id:
        query = query.filter(Station.type_id == str(type_id))
    
    if active_only:
        query = query.filter(Station.is_active == True)
    
    return query.all()


@router.post("", response_model=StationSchema)
async def create_station(
    station_data: StationCreate,
    db: Session = Depends(get_db)
):
    """Create a new station."""
    # Verify station type exists
    station_type = db.query(StationType).filter(StationType.id == str(station_data.type_id)).first()
    if not station_type:
        raise HTTPException(status_code=404, detail="Station type not found")
    
    # Convert UUID to string for database compatibility
    station_dict = station_data.model_dump()
    station_dict['type_id'] = str(station_dict['type_id'])
    
    station = Station(**station_dict)
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


@router.get("/{station_id}", response_model=StationWithType)
async def get_station(
    station_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a station by ID."""
    station = db.query(Station).filter(Station.id == str(station_id)).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


@router.put("/{station_id}", response_model=StationSchema)
async def update_station(
    station_id: UUID,
    station_data: StationUpdate,
    db: Session = Depends(get_db)
):
    """Update a station."""
    station = db.query(Station).filter(Station.id == str(station_id)).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Verify station type exists if being updated
    if station_data.type_id:
        station_type = db.query(StationType).filter(StationType.id == str(station_data.type_id)).first()
        if not station_type:
            raise HTTPException(status_code=404, detail="Station type not found")
    
    # Update fields
    update_data = station_data.model_dump(exclude_unset=True)
    # Convert UUID to string if type_id is being updated
    if 'type_id' in update_data:
        update_data['type_id'] = str(update_data['type_id'])
    
    for field, value in update_data.items():
        setattr(station, field, value)
    
    db.commit()
    db.refresh(station)
    return station


@router.delete("/{station_id}")
async def delete_station(
    station_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a station."""
    station = db.query(Station).filter(Station.id == str(station_id)).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    db.delete(station)
    db.commit()
    return {"message": "Station deleted successfully"}


# --- ServiceStationRequirement Routes ---
@router.get("/requirements/service/{service_id}", response_model=List[ServiceStationRequirementSchema])
async def get_service_station_requirements(
    service_id: UUID,
    db: Session = Depends(get_db)
):
    """Get station requirements for a specific service."""
    return db.query(ServiceStationRequirement).filter(
        ServiceStationRequirement.service_id == str(service_id)
    ).all()


@router.post("/requirements", response_model=ServiceStationRequirementSchema)
async def create_service_station_requirement(
    requirement_data: ServiceStationRequirementCreate,
    db: Session = Depends(get_db)
):
    """Create a new service station requirement."""
    # Check if requirement already exists
    existing = db.query(ServiceStationRequirement).filter(
        and_(
            ServiceStationRequirement.service_id == str(requirement_data.service_id),
            ServiceStationRequirement.station_type_id == str(requirement_data.station_type_id)
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Service station requirement already exists for this service and station type"
        )
    
    # Convert UUIDs to strings for database compatibility
    requirement_dict = requirement_data.model_dump()
    requirement_dict['service_id'] = str(requirement_dict['service_id'])
    requirement_dict['station_type_id'] = str(requirement_dict['station_type_id'])
    
    requirement = ServiceStationRequirement(**requirement_dict)
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return requirement


@router.put("/requirements/{service_id}/{station_type_id}", response_model=ServiceStationRequirementSchema)
async def update_service_station_requirement(
    service_id: UUID,
    station_type_id: UUID,
    requirement_data: ServiceStationRequirementUpdate,
    db: Session = Depends(get_db)
):
    """Update a service station requirement."""
    requirement = db.query(ServiceStationRequirement).filter(
        and_(
            ServiceStationRequirement.service_id == str(service_id),
            ServiceStationRequirement.station_type_id == str(station_type_id)
        )
    ).first()
    
    if not requirement:
        raise HTTPException(status_code=404, detail="Service station requirement not found")
    
    # Update fields
    update_data = requirement_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(requirement, field, value)
    
    db.commit()
    db.refresh(requirement)
    return requirement


@router.delete("/requirements/{service_id}/{station_type_id}")
async def delete_service_station_requirement(
    service_id: UUID,
    station_type_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a service station requirement."""
    requirement = db.query(ServiceStationRequirement).filter(
        and_(
            ServiceStationRequirement.service_id == str(service_id),
            ServiceStationRequirement.station_type_id == str(station_type_id)
        )
    ).first()
    
    if not requirement:
        raise HTTPException(status_code=404, detail="Service station requirement not found")
    
    db.delete(requirement)
    db.commit()
    return {"message": "Service station requirement deleted successfully"}