from typing import List, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response # Added Response
from sqlalchemy.orm import Session

# Schemas
from Core.Auth.Schemas import UserTenant as UserTenantSchema, UserTenantCreate, UserTenantUpdate
# Database dependency
from Core.Database.dependencies import get_db
# User services
from Modules.Users import services as user_services
# Auth dependencies and constants
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Auth.models import UserTenant # For type hinting current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
    # The X-Tenant-ID header will be implicitly checked by get_current_user_tenant for most routes.
    # For routes accessible by multiple roles, specific checks might be needed if behavior differs.
)

@router.post("/", response_model=UserTenantSchema, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_data: UserTenantCreate,
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can create new users within their tenant.
    # The get_current_user_tenant dependency also ensures X-Tenant-ID header matches token.
    creator: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    # tenant_id for the new user is taken from the creator's (Gestor's) tenant_id.
    # Service function create_user handles email uniqueness and role validation.
    db_user = user_services.create_user(db=db, user_data=user_data, tenant_id=creator.tenant_id)
    # Exceptions from service layer (e.g., 409 for email conflict, 400 for invalid role) will propagate.
    return db_user

@router.get("/me", response_model=UserTenantSchema)
def read_users_me(
    # get_current_user_tenant will handle token decoding, user fetching, and tenant_id matching.
    # No specific role is required here beyond being a valid, active user of the tenant.
    current_user: Annotated[UserTenant, Depends(get_current_user_tenant)]
):
    """
    Get current authenticated user's details.
    """
    return current_user

@router.get("/", response_model=List[UserTenantSchema])
def read_users_in_tenant(
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can list all users within their tenant.
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieve all users within the current user's (Gestor's) tenant.
    """
    users = user_services.get_users_by_tenant(
        db, tenant_id=current_user.tenant_id, skip=skip, limit=limit
    )
    return users

@router.get("/{user_id}", response_model=UserTenantSchema)
def read_user_by_id(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can fetch arbitrary users by ID within their tenant.
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Get a specific user by ID, within the current user's (Gestor's) tenant.
    """
    # Service function ensures user_id belongs to current_user.tenant_id
    db_user = user_services.get_user_by_id_and_tenant(db, user_id=user_id, tenant_id=current_user.tenant_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this tenant")
    return db_user

@router.put("/{user_id}", response_model=UserTenantSchema)
def update_existing_user(
    user_id: UUID,
    user_update_data: UserTenantUpdate, # Schema for update (no password change here)
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can update users within their tenant.
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Update a user's details (email, full_name, role, is_active) within the current user's (Gestor's) tenant.
    Password changes should be handled by a dedicated endpoint.
    """
    updated_user = user_services.update_user_tenant(
        db, user_id=user_id, user_data=user_update_data, tenant_id=current_user.tenant_id
    )
    if updated_user is None:
        # This could be due to user not found or other validation error handled in service
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed")
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_user(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can delete users within their tenant.
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Delete a user within the current user's (Gestor's) tenant.
    """
    # Prevent a GESTOR from deleting themselves (optional, but good practice)
    if user_id == current_user.user_id: # Corrected attribute access
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestor cannot delete themselves. Use account deactivation or another admin account."
        )

    deleted_successfully = user_services.delete_user_tenant(db, user_id=user_id, tenant_id=current_user.tenant_id)
    if not deleted_successfully:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or delete failed")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
