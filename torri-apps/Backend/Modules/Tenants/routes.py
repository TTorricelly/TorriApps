from typing import List, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload
from Core.TenantMigration.service import create_schema_and_migrate, TenantMigrationError

from .services import TenantService
from .schemas import (
    TenantSchema, TenantCreate, TenantUpdate, 
    TenantListResponse, TenantStatusUpdate
)

router = APIRouter()


@router.post(
    "/tenants",
    response_model=TenantSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tenant and initialize its database schema"
)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Create a new tenant and initialize its database schema.
    
    This endpoint:
    1. Creates the tenant record in the public schema
    2. Creates the tenant's database schema
    3. Runs migrations to set up the tenant's tables
    
    Only administrators can create tenants.
    """
    # Create tenant record
    tenant = TenantService.create_tenant(db, tenant_data)
    
    # Create tenant schema and run migrations
    try:
        create_schema_and_migrate(tenant.db_schema_name)
    except TenantMigrationError as e:
        # If schema creation fails, delete the tenant record
        TenantService.delete_tenant(db, tenant.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize tenant database schema: {str(e)}"
        )
    
    return tenant


@router.get(
    "/tenants",
    response_model=TenantListResponse,
    summary="List all tenants"
)
async def list_tenants(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    include_inactive: bool = Query(False, description="Include inactive tenants"),
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    List all tenants with pagination.
    
    Only administrators can list tenants.
    """
    tenants = TenantService.get_tenants(db, skip=skip, limit=limit, include_inactive=include_inactive)
    total = TenantService.count_tenants(db, include_inactive=include_inactive)
    
    return TenantListResponse(tenants=tenants, total=total)


@router.get(
    "/tenants/{tenant_id}",
    response_model=TenantSchema,
    summary="Get tenant by ID"
)
async def get_tenant(
    tenant_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Get a specific tenant by ID.
    
    Only administrators can view tenant details.
    """
    tenant = TenantService.get_tenant_by_id(db, tenant_id)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant


@router.put(
    "/tenants/{tenant_id}",
    response_model=TenantSchema,
    summary="Update tenant"
)
async def update_tenant(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Update a tenant's information.
    
    Only administrators can update tenants.
    """
    tenant = TenantService.update_tenant(db, tenant_id, tenant_data)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant


@router.patch(
    "/tenants/{tenant_id}/status",
    response_model=TenantSchema,
    summary="Update tenant status"
)
async def update_tenant_status(
    tenant_id: UUID,
    status_data: TenantStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Update a tenant's active status.
    
    Only administrators can change tenant status.
    """
    tenant_data = TenantUpdate(is_active=status_data.is_active)
    tenant = TenantService.update_tenant(db, tenant_id, tenant_data)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant


@router.delete(
    "/tenants/{tenant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete tenant"
)
async def delete_tenant(
    tenant_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Delete a tenant.
    
    WARNING: This will permanently delete the tenant record but NOT the database schema.
    The tenant's database schema must be manually cleaned up.
    
    Only administrators can delete tenants.
    """
    success = TenantService.delete_tenant(db, tenant_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )


@router.get(
    "/tenants/slug/{slug}",
    response_model=TenantSchema,
    summary="Get tenant by slug"
)
async def get_tenant_by_slug(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.ADMIN]))]
):
    """
    Get a tenant by its slug.
    
    Only administrators can view tenant details.
    """
    tenant = TenantService.get_tenant_by_slug(db, slug)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant