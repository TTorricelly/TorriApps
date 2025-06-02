from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional, List

from .models import Tenant
from .schemas import TenantCreate
from fastapi import HTTPException, status


class TenantService:
    
    @staticmethod
    def get_tenant_by_id(db: Session, tenant_id: UUID) -> Optional[Tenant]:
        """Get tenant by ID"""
        return db.query(Tenant).filter(Tenant.id == str(tenant_id)).first()
    
    @staticmethod
    def get_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        return db.query(Tenant).filter(Tenant.slug == slug).first()
    
    @staticmethod
    def get_tenant_by_schema_name(db: Session, schema_name: str) -> Optional[Tenant]:
        """Get tenant by database schema name"""
        return db.query(Tenant).filter(Tenant.db_schema_name == schema_name).first()
    
    @staticmethod
    def get_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[Tenant]:
        """Get list of tenants with pagination"""
        return db.query(Tenant).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_tenant(db: Session, tenant_data: TenantCreate) -> Tenant:
        """Create a new tenant"""
        try:
            db_tenant = Tenant(
                name=tenant_data.name,
                slug=tenant_data.slug,
                db_schema_name=tenant_data.db_schema_name,
                logo_url=tenant_data.logo_url,
                primary_color=tenant_data.primary_color,
                block_size_minutes=tenant_data.block_size_minutes
            )
            
            db.add(db_tenant)
            db.commit()
            db.refresh(db_tenant)
            
            # TODO: Create the actual database schema for this tenant
            # This would involve calling the tenant migration service
            # from Core.TenantMigration.service import TenantMigrationService
            # TenantMigrationService.create_tenant_schema(tenant_data.db_schema_name)
            
            return db_tenant
            
        except IntegrityError as e:
            db.rollback()
            if "slug" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tenant with this slug already exists"
                )
            elif "db_schema_name" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tenant with this schema name already exists"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Error creating tenant"
                )
    
    @staticmethod
    def update_tenant(db: Session, tenant_id: UUID, tenant_data: TenantCreate) -> Tenant:
        """Update an existing tenant"""
        try:
            db_tenant = TenantService.get_tenant_by_id(db, tenant_id)
            if not db_tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant not found"
                )
            
            # Update fields
            db_tenant.name = tenant_data.name
            db_tenant.slug = tenant_data.slug
            db_tenant.logo_url = tenant_data.logo_url
            db_tenant.primary_color = tenant_data.primary_color
            db_tenant.block_size_minutes = tenant_data.block_size_minutes
            
            # Note: db_schema_name should probably not be updatable
            # as it would require complex database migration
            
            db.commit()
            db.refresh(db_tenant)
            return db_tenant
            
        except IntegrityError as e:
            db.rollback()
            if "slug" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tenant with this slug already exists"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Error updating tenant"
                )
    
    @staticmethod
    def delete_tenant(db: Session, tenant_id: UUID) -> bool:
        """
        Delete a tenant and all associated data.
        WARNING: This is a destructive operation!
        """
        try:
            db_tenant = TenantService.get_tenant_by_id(db, tenant_id)
            if not db_tenant:
                return False
            
            # TODO: Before deleting the tenant record, we should:
            # 1. Delete all users associated with this tenant
            # 2. Drop the tenant's database schema
            # 3. Clean up any other associated resources
            
            # For now, just delete the tenant record
            db.delete(db_tenant)
            db.commit()
            
            # TODO: Drop the actual database schema
            # from Core.TenantMigration.service import TenantMigrationService
            # TenantMigrationService.drop_tenant_schema(db_tenant.db_schema_name)
            
            return True
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting tenant: {str(e)}"
            )
    
    @staticmethod
    def get_tenant_config(db: Session, tenant_id: UUID) -> dict:
        """Get tenant configuration for frontend theming"""
        tenant = TenantService.get_tenant_by_id(db, tenant_id)
        if not tenant:
            return {}
        
        return {
            "name": tenant.name,
            "slug": tenant.slug,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color,
            "block_size_minutes": tenant.block_size_minutes
        }