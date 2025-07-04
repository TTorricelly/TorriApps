"""
Tenant management routes.

These routes are for managing tenants and are typically accessed by system administrators.
They operate on the public schema and don't require tenant context.
"""

from typing import List, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload

from .schemas import (
    TenantSchema, TenantCreate, TenantUpdate, TenantListResponse, TenantStatsSchema
)
from .services import (
    create_tenant, get_tenant_by_id, get_tenant_by_slug, get_tenants,
    update_tenant, delete_tenant, get_tenant_stats
)

router = APIRouter(tags=["Tenant Management"])


@router.post(
    "/tenants",
    response_model=TenantSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tenant"
)
def create_tenant_endpoint(
    tenant_data: TenantCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Create a new tenant with dedicated database schema.
    
    This endpoint:
    1. Creates a tenant record in the public schema
    2. Creates a dedicated database schema for the tenant
    3. Runs database migrations in the tenant schema
    
    Requires GESTOR role or higher.
    """
    return create_tenant(db=db, tenant_data=tenant_data)


@router.get(
    "/tenants",
    response_model=TenantListResponse,
    summary="List all tenants"
)
def list_tenants_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return"),
    active_only: bool = Query(False, description="Only return active tenants")
):
    """
    List all tenants with pagination.
    
    Requires GESTOR role or higher.
    """
    tenants, total = get_tenants(db=db, skip=skip, limit=limit, active_only=active_only)
    
    return TenantListResponse(
        tenants=tenants,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get(
    "/tenants/{tenant_id}",
    response_model=TenantSchema,
    summary="Get tenant by ID"
)
def get_tenant_endpoint(
    tenant_id: UUID = Path(..., description="Tenant ID"),
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))] = None
):
    """
    Get a specific tenant by ID.
    
    Requires GESTOR role or higher.
    """
    tenant = get_tenant_by_id(db=db, tenant_id=tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


@router.get(
    "/tenants/slug/{slug}",
    response_model=TenantSchema,
    summary="Get tenant by slug"
)
def get_tenant_by_slug_endpoint(
    slug: str = Path(..., description="Tenant slug"),
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))] = None
):
    """
    Get a specific tenant by slug.
    
    Requires GESTOR role or higher.
    """
    tenant = get_tenant_by_slug(db=db, slug=slug)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with slug '{slug}' not found"
        )
    return tenant


@router.put(
    "/tenants/{tenant_id}",
    response_model=TenantSchema,
    summary="Update tenant"
)
def update_tenant_endpoint(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Update a tenant's information.
    
    Note: Slug cannot be updated as it affects database schema names.
    
    Requires GESTOR role or higher.
    """
    tenant = get_tenant_by_id(db=db, tenant_id=tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return update_tenant(db=db, tenant=tenant, tenant_data=tenant_data)


@router.delete(
    "/tenants/{tenant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete (deactivate) tenant"
)
def delete_tenant_endpoint(
    tenant_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Delete (deactivate) a tenant.
    
    This marks the tenant as inactive rather than permanently deleting it.
    Database schema cleanup should be handled separately.
    
    Requires GESTOR role or higher.
    """
    tenant = get_tenant_by_id(db=db, tenant_id=tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    delete_tenant(db=db, tenant=tenant)
    return None


@router.get(
    "/tenants/{tenant_id}/stats",
    response_model=TenantStatsSchema,
    summary="Get tenant statistics"
)
def get_tenant_stats_endpoint(
    tenant_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Get statistics for a specific tenant.
    
    Requires GESTOR role or higher.
    """
    tenant = get_tenant_by_id(db=db, tenant_id=tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    stats = get_tenant_stats(db=db, tenant=tenant)
    return TenantStatsSchema(**stats)