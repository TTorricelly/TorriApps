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

@router.get("/me", response_model=TenantSchema)
async def get_current_tenant(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_public_db)
):
    """
    Get current user's tenant information.
    Uses the tenant_id from the JWT token directly.
    """
    from Core.Security.jwt import decode_access_token
    from jose import JWTError
    
    try:
        # Decode token to get tenant_id
        payload = decode_access_token(token)
        if not payload or not payload.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or missing tenant information"
            )
        
        tenant_id = UUID(payload.tenant_id)
        
    except (JWTError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Fetch tenant from public schema
    tenant = TenantService.get_tenant_by_id(db, tenant_id)
    if not tenant:
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this tenant"
        )
    
    tenant = TenantService.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant