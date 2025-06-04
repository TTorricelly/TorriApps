from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from Core.Database.dependencies import get_db, get_public_db
from Core.Auth.dependencies import get_current_user_tenant, get_current_user_from_token, require_role, oauth2_scheme
from Core.Auth.models import UserTenant
from Core.Auth.constants import UserRole
from .models import Tenant
from .schemas import Tenant as TenantSchema, TenantCreate
from .services import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])

# DEPRECATED: This endpoint is no longer needed as tenant data is included in JWT
# and provided in the enhanced login response. Keeping for backward compatibility
# but should be removed in future versions.
@router.get("/me", response_model=TenantSchema)
async def get_current_tenant_deprecated(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_public_db)
):
    """
    DEPRECATED: Get current user's tenant information.
    
    This endpoint is deprecated as tenant data is now included directly in:
    1. JWT token payload (for session-based access)
    2. Enhanced login response (stored in frontend session)
    
    Use the tenant data from your session storage instead of calling this API.
    """
    from Core.Security.jwt import decode_access_token
    from jose import JWTError
    
    try:
        # Decode token to get tenant_id
        payload = decode_access_token(token)
        if not payload or not payload.tenant_id:
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or missing tenant information"
            )
        
        tenant_id = UUID(payload.tenant_id)
        
    except (JWTError, ValueError) as e:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Fetch tenant from public schema
    tenant = TenantService.get_tenant_by_id(db, tenant_id)
    if not tenant:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant

@router.get("/{tenant_id}", response_model=TenantSchema)
async def get_tenant_by_id(
    tenant_id: UUID,
    current_user: UserTenant = Depends(get_current_user_tenant),
    db: Session = Depends(get_public_db)
):
    """
    Get tenant by ID. Only accessible by users from the same tenant.
    """
    # Check if user has permission to access this tenant
    if str(current_user.tenant_id) != str(tenant_id):
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this tenant"
        )
    
    tenant = TenantService.get_tenant_by_id(db, tenant_id)
    if not tenant:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant