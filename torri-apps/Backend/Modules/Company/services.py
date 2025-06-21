from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from typing import Union

from .models import Company
from .schemas import CompanyCreate, CompanyUpdate


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
    db_company = Company(
        name=company_data.name,
        logo_url=company_data.logo_url,
        contact_email=company_data.contact_email,
        contact_phone=company_data.contact_phone,
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