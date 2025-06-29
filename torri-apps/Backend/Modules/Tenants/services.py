from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import re

from .models import Tenant
from .schemas import TenantCreate, TenantUpdate


class TenantService:
    """Service class for tenant operations"""
    
    @staticmethod
    def _generate_schema_name(slug: str) -> str:
        """Generate database schema name from tenant slug"""
        # Ensure schema name is valid for PostgreSQL
        # Must start with letter, contain only letters, numbers, underscores
        clean_slug = re.sub(r'[^a-zA-Z0-9_]', '_', slug.lower())
        if not clean_slug[0].isalpha():
            clean_slug = f"tenant_{clean_slug}"
        return f"tenant_{clean_slug}"
    
    @staticmethod
    def _validate_slug(slug: str) -> str:
        """Validate and normalize tenant slug"""
        # Convert to lowercase and replace invalid characters
        clean_slug = re.sub(r'[^a-zA-Z0-9-_]', '-', slug.lower())
        
        # Remove leading/trailing hyphens and underscores
        clean_slug = clean_slug.strip('-_')
        
        # Ensure minimum length
        if len(clean_slug) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant slug must be at least 2 characters long"
            )
        
        # Ensure maximum length
        if len(clean_slug) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant slug must be no more than 50 characters long"
            )
            
        return clean_slug
    
    @staticmethod
    def create_tenant(db: Session, tenant_data: TenantCreate) -> Tenant:
        """Create a new tenant"""
        # Validate and normalize slug
        clean_slug = TenantService._validate_slug(tenant_data.slug)
        
        # Generate schema name
        schema_name = TenantService._generate_schema_name(clean_slug)
        
        # Create tenant record
        tenant = Tenant(
            name=tenant_data.name,
            slug=clean_slug,
            db_schema_name=schema_name,
            contact_email=tenant_data.contact_email,
            contact_phone=tenant_data.contact_phone,
            description=tenant_data.description,
            is_active=tenant_data.is_active
        )
        
        try:
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            return tenant
        except IntegrityError as e:
            db.rollback()
            if "slug" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tenant slug '{clean_slug}' already exists"
                )
            elif "db_schema_name" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Database schema name '{schema_name}' already exists"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create tenant due to constraint violation"
                )
    
    @staticmethod
    def get_tenant_by_id(db: Session, tenant_id: UUID) -> Optional[Tenant]:
        """Get tenant by ID"""
        return db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    @staticmethod
    def get_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        return db.query(Tenant).filter(Tenant.slug == slug).first()
    
    @staticmethod
    def get_active_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
        """Get active tenant by slug"""
        return db.query(Tenant).filter(
            Tenant.slug == slug,
            Tenant.is_active == True
        ).first()
    
    @staticmethod
    def get_tenants(db: Session, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Tenant]:
        """Get list of tenants"""
        query = db.query(Tenant)
        
        if not include_inactive:
            query = query.filter(Tenant.is_active == True)
            
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def count_tenants(db: Session, include_inactive: bool = False) -> int:
        """Count total tenants"""
        query = db.query(Tenant)
        
        if not include_inactive:
            query = query.filter(Tenant.is_active == True)
            
        return query.count()
    
    @staticmethod
    def update_tenant(db: Session, tenant_id: UUID, tenant_data: TenantUpdate) -> Optional[Tenant]:
        """Update a tenant"""
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            return None
        
        # Update only provided fields
        update_data = tenant_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(tenant, field, value)
        
        try:
            db.commit()
            db.refresh(tenant)
            return tenant
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update tenant due to constraint violation"
            )
    
    @staticmethod
    def delete_tenant(db: Session, tenant_id: UUID) -> bool:
        """Delete a tenant"""
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            return False
        
        db.delete(tenant)
        db.commit()
        return True
    
    @staticmethod
    def deactivate_tenant(db: Session, tenant_id: UUID) -> Optional[Tenant]:
        """Deactivate a tenant (soft delete)"""
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            return None
        
        tenant.is_active = False
        db.commit()
        db.refresh(tenant)
        return tenant