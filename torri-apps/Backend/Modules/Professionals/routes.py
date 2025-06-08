from typing import List, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload
from Core.Utils.file_handler import file_handler

from .schemas import (
    Professional, ProfessionalCreate, ProfessionalUpdate,
    AvailabilityPeriod, AvailabilityUpdate,
    BlockedTime, BlockedTimeCreate, BlockedTimeUpdate,
    Break, BreakCreate, BreakUpdate,
    ServiceBasic, ServiceAssociationUpdate
)
from . import services as professional_services

router = APIRouter(prefix="/professionals", tags=["Professionals"])

# Professional CRUD endpoints
@router.get("/", response_model=List[Professional])
def list_professionals(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return")
):
    """List all professionals in the system."""
    professionals = professional_services.get_professionals(db, skip=skip, limit=limit)
    return professionals

@router.post("/", response_model=Professional, status_code=status.HTTP_201_CREATED)
def create_professional(
    professional_data: ProfessionalCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Create a new professional."""
    return professional_services.create_professional(db, professional_data) # current_user.tenant_id argument removed

@router.get("/{professional_id}", response_model=Professional)
def get_professional(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get a specific professional by ID."""
    professional = professional_services.get_professional_by_id(db, professional_id)
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    return professional

@router.put("/{professional_id}", response_model=Professional)
def update_professional(
    professional_id: UUID,
    professional_data: ProfessionalUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Update a professional."""
    professional = professional_services.update_professional(db, professional_id, professional_data)
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    return professional

@router.delete("/{professional_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_professional(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Delete a professional."""
    success = professional_services.delete_professional(db, professional_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )

# Photo upload endpoint
@router.post("/{professional_id}/photo", response_model=Professional)
async def upload_professional_photo(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    photo: UploadFile = File(...)
):
    """Upload a photo for a professional."""
    # Get the raw User object for updating
    from Core.Auth.models import User # Updated import
    professional = db.query(User).filter( # Changed UserTenant to User
        User.id == str(professional_id), # Changed UserTenant to User
        User.role == UserRole.PROFISSIONAL # Changed UserTenant to User
    ).first()
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    
    # Handle photo upload
    try:
        # Delete old photo if exists
        if professional.photo_path:
            file_handler.delete_file(professional.photo_path)
        
        # Save new photo
        photo_path = await file_handler.save_uploaded_file(
            file=photo,
            tenant_id="default",  # Use default for single schema
            subdirectory="professionals/photos"
        )
        
        # Update professional with photo path
        professional.photo_path = photo_path
        db.commit()
        
        # Return Professional schema with photo_url
        return professional_services._add_photo_url_to_professional(professional, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload da foto: {str(e)}"
        )

# Service association endpoints
@router.get("/{professional_id}/services", response_model=List[ServiceBasic])
def get_professional_services(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get services associated with a professional."""
    services = professional_services.get_professional_services(db, professional_id)
    return services

@router.put("/{professional_id}/services", response_model=List[ServiceBasic])
def update_professional_services(
    professional_id: UUID,
    service_data: ServiceAssociationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Update services associated with a professional."""
    services = professional_services.update_professional_services(db, professional_id, service_data)
    return services

# Availability endpoints
@router.get("/{professional_id}/availability", response_model=List[AvailabilityPeriod])
def get_professional_availability(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get professional's availability schedule."""
    availability = professional_services.get_professional_availability(db, professional_id)
    return availability

@router.put("/{professional_id}/availability", response_model=List[AvailabilityPeriod])
def update_professional_availability(
    professional_id: UUID,
    availability_data: AvailabilityUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Update professional's availability schedule."""
    availability = professional_services.update_professional_availability(db, professional_id, availability_data)
    return availability

# Blocked times endpoints
@router.get("/{professional_id}/blocked_times", response_model=List[BlockedTime])
def get_professional_blocked_times(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get professional's blocked time periods."""
    blocked_times = professional_services.get_professional_blocked_times(db, professional_id)
    return blocked_times

@router.post("/{professional_id}/blocked_times", response_model=BlockedTime, status_code=status.HTTP_201_CREATED)
def create_blocked_time(
    professional_id: UUID,
    blocked_time_data: BlockedTimeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Create a new blocked time period for a professional."""
    return professional_services.create_blocked_time(db, professional_id, blocked_time_data)

@router.put("/{professional_id}/blocked_times/{blocked_time_id}", response_model=BlockedTime)
def update_blocked_time(
    professional_id: UUID,
    blocked_time_id: UUID,
    blocked_time_data: BlockedTimeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Update a blocked time period."""
    blocked_time = professional_services.update_blocked_time(db, professional_id, blocked_time_id, blocked_time_data)
    if not blocked_time:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Período bloqueado não encontrado"
        )
    return blocked_time

@router.delete("/{professional_id}/blocked_times/{blocked_time_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blocked_time(
    professional_id: UUID,
    blocked_time_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Delete a blocked time period."""
    success = professional_services.delete_blocked_time(db, professional_id, blocked_time_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Período bloqueado não encontrado"
        )

# Breaks endpoints
@router.get("/{professional_id}/breaks", response_model=List[Break])
def get_professional_breaks(
    professional_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Get professional's recurring breaks."""
    breaks = professional_services.get_professional_breaks(db, professional_id)
    return breaks

@router.post("/{professional_id}/breaks", response_model=Break, status_code=status.HTTP_201_CREATED)
def create_break(
    professional_id: UUID,
    break_data: BreakCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Create a new recurring break for a professional."""
    return professional_services.create_break(db, professional_id, break_data)

@router.put("/{professional_id}/breaks/{break_id}", response_model=Break)
def update_break(
    professional_id: UUID,
    break_id: UUID,
    break_data: BreakUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Update a recurring break."""
    break_obj = professional_services.update_break(db, professional_id, break_id, break_data)
    if not break_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pausa não encontrada"
        )
    return break_obj

@router.delete("/{professional_id}/breaks/{break_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_break(
    professional_id: UUID,
    break_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """Delete a recurring break."""
    success = professional_services.delete_break(db, professional_id, break_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pausa não encontrada"
        )