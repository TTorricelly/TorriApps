from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from typing import Union
from fastapi import UploadFile

from .models import Company
from .schemas import CompanyCreate, CompanyUpdate
from Core.Utils.Helpers import normalize_phone_number
from Core.Utils.file_handler import save_file, delete_file


def get_company(db: Session, company_id: Union[UUID, str]) -> Optional[Company]:
    """Get a company by ID."""
    company_id_str = str(company_id) if isinstance(company_id, UUID) else company_id
    return db.query(Company).filter(Company.id == company_id_str).first()


def get_companies(db: Session, skip: int = 0, limit: int = 100) -> List[Company]:
    """Get all companies with pagination."""
    return db.query(Company).filter(Company.is_active == True).offset(skip).limit(limit).all()


def get_active_company(db: Session) -> Optional[Company]:
    """Get the first active company (assumes single company setup)."""
    return db.query(Company).filter(Company.is_active == True).first()


def create_company(db: Session, company_data: CompanyCreate) -> Company:
    """Create a new company."""
    # Normalize contact phone if provided
    normalized_contact_phone = normalize_phone_number(company_data.contact_phone) if company_data.contact_phone else None
    
    db_company = Company(
        name=company_data.name,
        logo_url=company_data.logo_url,
        contact_email=company_data.contact_email,
        contact_phone=normalized_contact_phone,
        is_active=company_data.is_active
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def update_company(db: Session, company_id: Union[UUID, str], company_data: CompanyUpdate) -> Optional[Company]:
    """Update an existing company."""
    company_id_str = str(company_id) if isinstance(company_id, UUID) else company_id
    db_company = db.query(Company).filter(Company.id == company_id_str).first()
    if not db_company:
        return None
    
    # Update only provided fields
    update_data = company_data.dict(exclude_unset=True)
    
    # Handle phone number normalization if contact_phone is being updated
    if 'contact_phone' in update_data and update_data['contact_phone'] is not None:
        update_data['contact_phone'] = normalize_phone_number(update_data['contact_phone'])
    
    for field, value in update_data.items():
        setattr(db_company, field, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company


def delete_company(db: Session, company_id: Union[UUID, str]) -> bool:
    """Soft delete a company by setting is_active to False."""
    company_id_str = str(company_id) if isinstance(company_id, UUID) else company_id
    db_company = db.query(Company).filter(Company.id == company_id_str).first()
    if not db_company:
        return False
    
    db_company.is_active = False
    db.commit()
    return True


def get_company_by_name(db: Session, name: str) -> Optional[Company]:
    """Get a company by name."""
    return db.query(Company).filter(Company.name == name, Company.is_active == True).first()


def upload_company_logo(db: Session, company_id: Union[UUID, str], logo_file: UploadFile) -> Optional[Company]:
    """Upload company logo image."""
    company_id_str = str(company_id) if isinstance(company_id, UUID) else company_id
    db_company = db.query(Company).filter(Company.id == company_id_str).first()
    if not db_company:
        return None
    
    try:
        # Delete old logo if it exists
        if db_company.logo_url:
            old_logo_path = db_company.logo_url.replace('/uploads/', '')
            try:
                delete_file(old_logo_path)
            except Exception as e:
                # Log the error but don't fail the upload
                print(f"Warning: Could not delete old logo file: {e}")
        
        # Save new logo file
        file_path = save_file(logo_file, "company/logos")
        
        # Update company with new logo path
        db_company.logo_url = f"/uploads/{file_path}"
        db.commit()
        db.refresh(db_company)
        
        return db_company
    
    except Exception as e:
        db.rollback()
        raise e