"""
Tenant services for managing multi-tenant operations.
"""

from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from .models import Tenant
from .schemas import TenantCreate, TenantUpdate
from Core.TenantMigration.service import create_schema_and_migrate, TenantMigrationError


def _generate_schema_name(slug: str) -> str:
    """Generate database schema name from tenant slug."""
    return f"tenant_{slug}"


def create_tenant(db: Session, tenant_data: TenantCreate) -> Tenant:
    """
    Create a new tenant with database schema.
    
    Args:
        db: Database session (connected to public schema)
        tenant_data: Tenant creation data
        
    Returns:
        Tenant: Created tenant object
        
    Raises:
        HTTPException: If slug already exists or schema creation fails
    """
    # Check if slug already exists
    existing_tenant = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant with slug '{tenant_data.slug}' already exists"
        )
    
    # Generate schema name
    schema_name = _generate_schema_name(tenant_data.slug)
    
    # Check if schema name already exists
    existing_schema = db.query(Tenant).filter(Tenant.db_schema_name == schema_name).first()
    if existing_schema:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Database schema '{schema_name}' already exists"
        )
    
    # Create tenant record
    db_tenant = Tenant(
        name=tenant_data.name,
        slug=tenant_data.slug,
        db_schema_name=schema_name,
        is_active=tenant_data.is_active,
        max_users=tenant_data.max_users
    )
    
    try:
        db.add(db_tenant)
        db.commit()
        db.refresh(db_tenant)
        
        # Create database schema and run migrations
        try:
            create_schema_and_migrate(schema_name)
        except TenantMigrationError as e:
            # Rollback tenant creation if schema creation fails
            db.delete(db_tenant)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create tenant database schema: {str(e)}"
            )
        
        return db_tenant
        
    except IntegrityError as e:
        db.rollback()
        if "slug" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tenant with slug '{tenant_data.slug}' already exists"
            )
        elif "db_schema_name" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Database schema '{schema_name}' already exists"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create tenant due to database constraint"
            )


def get_tenant_by_id(db: Session, tenant_id: UUID) -> Optional[Tenant]:
    """Get tenant by ID."""
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()


def get_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
    """Get tenant by slug."""
    return db.query(Tenant).filter(Tenant.slug == slug).first()


def get_active_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
    """Get active tenant by slug."""
    return db.query(Tenant).filter(
        Tenant.slug == slug,
        Tenant.is_active == True
    ).first()


def get_tenants(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> Tuple[List[Tenant], int]:
    """
    Get list of tenants with pagination.
    
    Returns:
        Tuple[List[Tenant], int]: List of tenants and total count
    """
    query = db.query(Tenant)
    
    if active_only:
        query = query.filter(Tenant.is_active == True)
    
    total = query.count()
    tenants = query.offset(skip).limit(limit).all()
    
    return tenants, total


def update_tenant(db: Session, tenant: Tenant, tenant_data: TenantUpdate) -> Tenant:
    """
    Update an existing tenant.
    
    Args:
        db: Database session
        tenant: Existing tenant object
        tenant_data: Update data
        
    Returns:
        Tenant: Updated tenant object
    """
    update_data = tenant_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(tenant, field, value)
    
    try:
        db.commit()
        db.refresh(tenant)
        return tenant
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant due to database constraint"
        )


def delete_tenant(db: Session, tenant: Tenant) -> bool:
    """
    Delete a tenant.
    
    Note: This only marks the tenant as inactive. 
    Database schema cleanup should be handled separately.
    
    Args:
        db: Database session
        tenant: Tenant to delete
        
    Returns:
        bool: True if successful
    """
    try:
        # For safety, just mark as inactive instead of hard delete
        tenant.is_active = False
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tenant"
        )


def get_tenant_stats(db: Session, tenant: Tenant) -> dict:
    """
    Get statistics for a tenant (placeholder for future implementation).
    
    Args:
        db: Database session
        tenant: Tenant object
        
    Returns:
        dict: Tenant statistics
    """
    # Placeholder - in real implementation, this would query the tenant schema
    return {
        "id": tenant.id,
        "name": tenant.name,
        "slug": tenant.slug,
        "is_active": tenant.is_active,
        "user_count": 0,  # TODO: Query tenant schema for actual count
        "max_users": tenant.max_users,
        "created_at": tenant.created_at,
    }