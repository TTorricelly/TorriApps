from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from Core.Auth.models import UserTenant
from Core.Auth.constants import UserRole
from Core.Security.hashing import get_password_hash
from Core.Utils.file_handler import file_handler
from Modules.Services.models import Service
from .models import ProfessionalAvailability, ProfessionalBlockedTime, ProfessionalBreak, DayOfWeek
from .schemas import (
    ProfessionalCreate, ProfessionalUpdate, Professional,
    AvailabilityPeriodCreate, AvailabilityUpdate, AvailabilityPeriod,
    BlockedTimeCreate, BlockedTimeUpdate, BlockedTime,
    BreakCreate, BreakUpdate, Break,
    ServiceAssociationUpdate
)

# Helper function to convert professional with photo URL
def _add_photo_url_to_professional(professional: UserTenant, db: Session = None, base_url: str = "http://localhost:8000") -> Professional:
    """Convert UserTenant model to Professional schema with photo_url."""
    photo_url = None
    if professional.photo_path:
        photo_url = file_handler.get_public_url(professional.photo_path, base_url)
    
    # Get services offered by querying the association table directly
    services_offered = []
    if db:
        try:
            from Modules.Services.models import Service, service_professionals_association
            services_offered = db.query(Service).join(
                service_professionals_association,
                Service.id == service_professionals_association.c.service_id
            ).filter(
                service_professionals_association.c.professional_user_id == str(professional.id)
            ).all()
        except Exception:
            # If services can't be loaded, just return empty list
            services_offered = []
    
    professional_data = Professional(
        id=professional.id,
        full_name=professional.full_name or "",
        email=professional.email,
        is_active=professional.is_active,
        role=professional.role.value,
        services_offered=services_offered,
        photo_url=photo_url
    )
    return professional_data

# Professional CRUD operations
def get_professional_by_id(db: Session, professional_id: UUID) -> Optional[Professional]:
    professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if professional:
        return _add_photo_url_to_professional(professional, db)
    return None

def get_professionals(db: Session, skip: int = 0, limit: int = 100) -> List[Professional]:
    professionals = db.query(UserTenant).filter(
        UserTenant.role == UserRole.PROFISSIONAL
    ).offset(skip).limit(limit).all()
    return [_add_photo_url_to_professional(prof, db) for prof in professionals]

def create_professional(db: Session, professional_data: ProfessionalCreate, tenant_id: UUID = None) -> Professional:
    # Check if email already exists
    existing_user = db.query(UserTenant).filter(UserTenant.email == professional_data.email).first()
    if existing_user:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já está em uso"
        )
    
    # Hash password
    hashed_password = get_password_hash(professional_data.password)
    
    # Create professional with tenant_id
    db_professional = UserTenant(
        email=professional_data.email,
        hashed_password=hashed_password,
        role=UserRole.PROFISSIONAL,
        full_name=professional_data.full_name,
        is_active=professional_data.is_active,
        tenant_id=str(tenant_id) if tenant_id else None
    )
    
    db.add(db_professional)
    db.commit()
    return _add_photo_url_to_professional(db_professional, db)

def update_professional(db: Session, professional_id: UUID, professional_data: ProfessionalUpdate) -> Optional[Professional]:
    # Get the raw UserTenant object, not the converted Professional schema
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        return None
    
    # Check email uniqueness if being updated
    if professional_data.email and professional_data.email != db_professional.email:
        existing_user = db.query(UserTenant).filter(
            UserTenant.email == professional_data.email,
            UserTenant.id != str(professional_id)
        ).first()
        if existing_user:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email já está em uso"
            )
    
    # Update fields
    update_data = professional_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_professional, field, value)
    
    db.commit()
    return _add_photo_url_to_professional(db_professional, db)

def delete_professional(db: Session, professional_id: UUID) -> bool:
    # Get the raw UserTenant object for deletion
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        return False
    
    db.delete(db_professional)
    db.commit()
    return True

# Service association operations
def get_professional_services(db: Session, professional_id: UUID) -> List[Service]:
    # Get the raw UserTenant object to access services_offered relationship
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        return []
    return db_professional.services_offered

def update_professional_services(db: Session, professional_id: UUID, service_data: ServiceAssociationUpdate) -> List[Service]:
    # Get the raw UserTenant object to access services_offered relationship
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    
    # Get services by IDs
    services = db.query(Service).filter(Service.id.in_([str(sid) for sid in service_data.service_ids])).all()
    
    # Update association
    db_professional.services_offered = services
    db.commit()
    
    return services

# Availability operations
def get_professional_availability(db: Session, professional_id: UUID) -> List[ProfessionalAvailability]:
    return db.query(ProfessionalAvailability).filter(
        ProfessionalAvailability.professional_user_id == str(professional_id)
    ).all()

def update_professional_availability(db: Session, professional_id: UUID, availability_data: AvailabilityUpdate) -> List[ProfessionalAvailability]:
    # Verify professional exists
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    
    # Delete existing availability
    db.query(ProfessionalAvailability).filter(
        ProfessionalAvailability.professional_user_id == str(professional_id)
    ).delete()
    
    # Add new availability periods
    new_periods = []
    for day_name, periods in availability_data.model_dump().items():
        if periods:  # Only process days that have periods
            day_enum = DayOfWeek(day_name)
            for period_data in periods:
                period = ProfessionalAvailability(
                    professional_user_id=str(professional_id),
                    tenant_id=str(db_professional.tenant_id) if db_professional.tenant_id else None,
                    day_of_week=day_enum,
                    start_time=period_data['start_time'],
                    end_time=period_data['end_time']
                )
                new_periods.append(period)
                db.add(period)
    
    db.commit()
    return new_periods

# Blocked times operations
def get_professional_blocked_times(db: Session, professional_id: UUID) -> List[ProfessionalBlockedTime]:
    return db.query(ProfessionalBlockedTime).filter(
        ProfessionalBlockedTime.professional_user_id == str(professional_id)
    ).all()

def create_blocked_time(db: Session, professional_id: UUID, blocked_time_data: BlockedTimeCreate) -> ProfessionalBlockedTime:
    # Verify professional exists
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    
    # Convert blocked_date to block_date for compatibility
    data_dict = blocked_time_data.model_dump()
    data_dict['block_date'] = data_dict.pop('blocked_date')
    
    db_blocked_time = ProfessionalBlockedTime(
        professional_user_id=str(professional_id),
        tenant_id=str(db_professional.tenant_id) if db_professional.tenant_id else None,
        **data_dict
    )
    
    db.add(db_blocked_time)
    db.commit()
    return db_blocked_time

def update_blocked_time(db: Session, professional_id: UUID, blocked_time_id: UUID, blocked_time_data: BlockedTimeUpdate) -> Optional[ProfessionalBlockedTime]:
    db_blocked_time = db.query(ProfessionalBlockedTime).filter(
        ProfessionalBlockedTime.id == str(blocked_time_id),
        ProfessionalBlockedTime.professional_user_id == str(professional_id)
    ).first()
    
    if not db_blocked_time:
        return None
    
    # Update fields
    update_data = blocked_time_data.model_dump(exclude_unset=True)
    # Handle field name mapping
    if 'blocked_date' in update_data:
        update_data['block_date'] = update_data.pop('blocked_date')
    
    for field, value in update_data.items():
        setattr(db_blocked_time, field, value)
    
    db.commit()
    return db_blocked_time

def delete_blocked_time(db: Session, professional_id: UUID, blocked_time_id: UUID) -> bool:
    db_blocked_time = db.query(ProfessionalBlockedTime).filter(
        ProfessionalBlockedTime.id == str(blocked_time_id),
        ProfessionalBlockedTime.professional_user_id == str(professional_id)
    ).first()
    
    if not db_blocked_time:
        return False
    
    db.delete(db_blocked_time)
    db.commit()
    return True

# Breaks operations
def get_professional_breaks(db: Session, professional_id: UUID) -> List[ProfessionalBreak]:
    return db.query(ProfessionalBreak).filter(
        ProfessionalBreak.professional_user_id == str(professional_id)
    ).all()

def create_break(db: Session, professional_id: UUID, break_data: BreakCreate) -> ProfessionalBreak:
    # Verify professional exists
    db_professional = db.query(UserTenant).filter(
        UserTenant.id == str(professional_id),
        UserTenant.role == UserRole.PROFISSIONAL
    ).first()
    if not db_professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado"
        )
    
    db_break = ProfessionalBreak(
        professional_user_id=str(professional_id),
        tenant_id=str(db_professional.tenant_id) if db_professional.tenant_id else None,
        **break_data.model_dump()
    )
    
    db.add(db_break)
    db.commit()
    return db_break

def update_break(db: Session, professional_id: UUID, break_id: UUID, break_data: BreakUpdate) -> Optional[ProfessionalBreak]:
    db_break = db.query(ProfessionalBreak).filter(
        ProfessionalBreak.id == str(break_id),
        ProfessionalBreak.professional_user_id == str(professional_id)
    ).first()
    
    if not db_break:
        return None
    
    # Update fields
    update_data = break_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_break, field, value)
    
    db.commit()
    return db_break

def delete_break(db: Session, professional_id: UUID, break_id: UUID) -> bool:
    db_break = db.query(ProfessionalBreak).filter(
        ProfessionalBreak.id == str(break_id),
        ProfessionalBreak.professional_user_id == str(professional_id)
    ).first()
    
    if not db_break:
        return False
    
    db.delete(db_break)
    db.commit()
    return True