from typing import List, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Schemas
from .schemas import Company as CompanySchema, CompanyCreate, CompanyUpdate, CompanyPublic
# Database dependency
from Core.Database.dependencies import get_db
# Company services
from . import services as company_services
# Auth dependencies and constants
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.constants import UserRole
from Core.Auth.models import User

router = APIRouter(
    prefix="/company",
    tags=["company"],
)

# Public endpoint for mobile app to get company info
@router.get("/info", response_model=CompanyPublic)
def get_company_info(db: Annotated[Session, Depends(get_db)]):
    """
    Public endpoint to get basic company information for mobile app.
    Returns the first active company.
    """
    company = company_services.get_active_company(db)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active company found"
        )
    return company


@router.get("", response_model=List[CompanySchema])
def read_companies(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    skip: int = 0,
    limit: int = 100
):
    """
    Get all companies. Only GESTOR can access this.
    """
    companies = company_services.get_companies(db, skip=skip, limit=limit)
    return companies


@router.post("", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
def create_company(
    company_data: CompanyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Create a new company. Only GESTOR can create companies.
    """
    # Check if company with same name already exists
    existing_company = company_services.get_company_by_name(db, company_data.name)
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company with this name already exists"
        )
    
    return company_services.create_company(db=db, company_data=company_data)


@router.get("/{company_id}", response_model=CompanySchema)
def read_company(
    company_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Get a specific company by ID. Only GESTOR can access this.
    """
    company = company_services.get_company(db, company_id=company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.put("/{company_id}", response_model=CompanySchema)
def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Update a company. Only GESTOR can update companies.
    """
    company = company_services.update_company(db, company_id=company_id, company_data=company_data)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or update failed"
        )
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Soft delete a company. Only GESTOR can delete companies.
    """
    success = company_services.delete_company(db, company_id=company_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or delete failed"
        )