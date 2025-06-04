from typing import Annotated
from uuid import UUID
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordRequestForm # Example if using form data, but we'll use JSON body
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db, get_public_db # Adjusted import path
from Core.Auth import Schemas # Contains Token, TokenData, LoginRequest
from Core.Auth import services as auth_services # Alias to avoid name clash
from Core.Security.jwt import create_access_token
from Config.Settings import settings # For access_token_expire_minutes
# UserTenant schema might be needed if returning user details post-login, but Token is the primary response
# from Core.Auth.Schemas import UserTenant

router = APIRouter(prefix='/auth', tags=['auth'])

# The /register endpoint is removed as per instructions.
# User creation will be handled by a dedicated Users module.

@router.post("/login", response_model=Schemas.Token)
async def login_for_access_token(
    login_request: Schemas.LoginRequest, # Using Pydantic model for request body
    db: Session = Depends(get_db)  # SIMPLIFIED: Use single schema DB
):

    user, error_message, tenant_schema = auth_services.enhanced_authenticate_user(
        db,
        email=login_request.email,
        password=login_request.password,
        tenant_id=getattr(login_request, 'tenant_id', None)  # Use tenant_id from request if provided
    )

    if not user:
        # Determine appropriate status code based on error message
        status_code = status.HTTP_401_UNAUTHORIZED
        if error_message and "multiple tenants" in error_message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
        elif error_message and "not found" in error_message.lower():
            status_code = status.HTTP_404_NOT_FOUND
            
        raise HTTPException(
            status_code=status_code,
            detail=error_message or "Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None,
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

    # Include complete user data in JWT to avoid database calls during requests
    # user.tenant_id is UUID, user.role is Enum
    token_data = {
        "sub": user.email,
        "tenant_id": str(user.tenant_id) if user.tenant_id else "default", # Convert UUID to string for JWT
        "tenant_schema": tenant_schema, # Include schema name for direct access
        "role": user.role.value, # Convert Enum to string value for JWT
        # Additional user data to avoid DB calls
        "user_id": str(user.id),
        "full_name": user.full_name,
        "is_active": user.is_active
    }

    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/enhanced-login", response_model=Schemas.EnhancedToken)
async def enhanced_login_for_access_token(
    login_request: Schemas.EnhancedLoginRequest,
    db: Session = Depends(get_db)  # SIMPLIFIED: Use single schema DB
):
    """
    Enhanced login endpoint that can discover tenant by email.
    
    - If tenant_id is provided in the request body, uses standard authentication
    - If tenant_id is not provided, searches for the email across all tenant schemas
    - Returns appropriate errors for multiple tenants or email not found
    
    Security considerations:
    - Schema names are validated to prevent SQL injection
    - Only searches active users
    - All attempts are logged for auditing
    - Note: Searches all tenant schemas (no artificial limit)
    """
    user, error_message, tenant_schema = auth_services.enhanced_authenticate_user(
        db,
        email=login_request.email,
        password=login_request.password,
        tenant_id=login_request.tenant_id
    )
    
    # Also get tenant data from public schema for the response
    from Modules.Tenants.services import TenantService
    tenant_data = None
    if user and user.tenant_id:
        tenant_data = TenantService.get_tenant_by_id(db, user.tenant_id)
    
    if not user:
        # Determine appropriate status code based on error message
        status_code = status.HTTP_401_UNAUTHORIZED
        if error_message and "multiple tenants" in error_message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
        elif error_message and "not found" in error_message.lower():
            status_code = status.HTTP_404_NOT_FOUND
            
        raise HTTPException(
            status_code=status_code,
            detail=error_message or "Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None,
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

    # Include complete user data in JWT to avoid database calls during requests
    # user.tenant_id is UUID, user.role is Enum
    token_data = {
        "sub": user.email,
        "tenant_id": str(user.tenant_id) if user.tenant_id else "default", # Convert UUID to string for JWT
        "tenant_schema": tenant_schema, # Include schema name for direct access
        "role": user.role.value, # Convert Enum to string value for JWT
        # Additional user data to avoid DB calls
        "user_id": str(user.id),
        "full_name": user.full_name,
        "is_active": user.is_active
    }

    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    # Prepare tenant info
    tenant_info = None
    if tenant_data:
        tenant_info = {
            "id": tenant_data.id,
            "name": tenant_data.name,
            "slug": tenant_data.slug,
            "logo_url": tenant_data.logo_url,
            "primary_color": tenant_data.primary_color,
            "block_size_minutes": tenant_data.block_size_minutes
        }
    else:
        # Default tenant info for single schema mode
        tenant_info = {
            "id": user.tenant_id or "default",
            "name": "Default Tenant",
            "slug": "default",
            "logo_url": None,
            "primary_color": "#00BFFF",
            "block_size_minutes": 30
        }

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "tenant_id": user.tenant_id,
        "tenant": tenant_info,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }

# Example of how OAuth2PasswordRequestForm would be used if not using a JSON body:
# @router.post("/token", response_model=Schemas.Token)
# async def login_for_access_token_form(
#     form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
#     x_tenant_id: Annotated[UUID | None, Header(alias="X-Tenant-ID")] = None,
#     db: Session = Depends(get_db)
# ):
#     if x_tenant_id is None:
#         raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")
#     user = auth_services.authenticate_user(db, tenant_id=x_tenant_id, email=form_data.username, password=form_data.password)
#     # ... rest of the logic
#     return {"access_token": access_token, "token_type": "bearer"}
