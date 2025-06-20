from typing import List, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response # Added Response
from sqlalchemy.orm import Session

# Schemas
from Core.Auth.Schemas import User as UserSchema, UserCreate, UserUpdate # Updated imports
# Database dependency
from Core.Database.dependencies import get_db
# User services
from Modules.Users import services as user_services
# Auth dependencies and constants
# Updated: get_current_user_from_db is now used for /me endpoint
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.constants import UserRole
from Core.Auth.models import User # For type hinting current_user. Updated import

router = APIRouter(
    prefix="/users",
    tags=["users"],
    # The X-Tenant-ID header will be implicitly checked by get_current_user_tenant for most routes.
    # For routes accessible by multiple roles, specific checks might be needed if behavior differs.
)

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED) # Fixed UserTenantSchema to UserSchema
def create_new_user(
    user_data: UserCreate, # Updated schema
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can create new users.
    creator: Annotated[User, Depends(require_role([UserRole.GESTOR]))] # Updated type
):
    # tenant_id for the new user is no longer relevant.
    # Service function create_user handles email uniqueness and role validation.
    db_user = user_services.create_user(db=db, user_data=user_data) # tenant_id argument removed
    # Exceptions from service layer (e.g., 409 for email conflict, 400 for invalid role) will propagate.
    return db_user

@router.get("/me", response_model=UserSchema) # Updated schema
def read_users_me(
    # Changed dependency to get_current_user_from_db
    current_user: Annotated[User, Depends(get_current_user_from_db)]
):
    """
    Get current authenticated user's details.
    """
    return current_user

@router.put("/me", response_model=UserSchema)
def update_current_user_profile(
    user_update_data: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user_from_db)]
):
    """
    Update current authenticated user's profile.
    Allows any authenticated user to update their own information.
    Note: Users cannot change their own role or is_active status for security.
    """
    # For security, prevent users from changing their own role or active status
    # Create a new UserUpdate object with only the safe fields
    # Don't include role and is_active at all (don't even set them to None)
    safe_update_data = UserUpdate(
        email=user_update_data.email,
        full_name=user_update_data.full_name,
        phone_number=user_update_data.phone_number,
        date_of_birth=user_update_data.date_of_birth,
        hair_type=user_update_data.hair_type,
        gender=user_update_data.gender
        # role and is_active are intentionally omitted
    )
    
    updated_user = user_services.update_user(
        db, user_id=current_user.id, user_data=safe_update_data
    )
    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User profile update failed"
        )
    return updated_user

@router.get("/", response_model=List[UserSchema]) # Updated schema
def read_users_in_tenant( # Function name might be misleading now, consider renaming to read_all_users
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can list all users.
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))], # Updated type
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieve all users.
    """
    users = user_services.get_users( # Renamed service call, tenant_id argument removed
        db, skip=skip, limit=limit
    )
    return users

@router.get("/{user_id}", response_model=UserSchema) # Updated schema
def read_user_by_id(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can fetch arbitrary users by ID.
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))] # Updated type
):
    """
    Get a specific user by ID.
    """
    # Service function ensures user_id exists.
    db_user = user_services.get_user_by_id(db, user_id=user_id) # Renamed service call, tenant_id argument removed
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") # Updated detail
    return db_user

@router.put("/{user_id}", response_model=UserSchema) # Updated schema
def update_existing_user(
    user_id: UUID,
    user_update_data: UserUpdate, # Updated schema
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can update users.
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))] # Updated type
):
    """
    Update a user's details (email, full_name, role, is_active).
    Password changes should be handled by a dedicated endpoint.
    """
    updated_user = user_services.update_user( # Renamed service call, tenant_id argument removed
        db, user_id=user_id, user_data=user_update_data
    )
    if updated_user is None:
        # This could be due to user not found or other validation error handled in service
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed")
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_user(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    # Only a GESTOR can delete users.
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))] # Updated type
):
    """
    Delete a user.
    """
    # Prevent a GESTOR from deleting themselves (optional, but good practice)
    if user_id == current_user.id: # Changed to .id
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestor cannot delete themselves. Use account deactivation or another admin account."
        )

    deleted_successfully = user_services.delete_user(db, user_id=user_id) # Renamed service call, tenant_id argument removed
    if not deleted_successfully:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or delete failed")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
