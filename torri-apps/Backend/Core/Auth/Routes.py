from typing import Annotated
from uuid import UUID
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordRequestForm # Example if using form data, but we'll use JSON body
from sqlalchemy.orm import Session

from Backend.Core.Database.dependencies import get_db # Adjusted import path
from Backend.Core.Auth import Schemas # Contains Token, TokenData, LoginRequest
from Backend.Core.Auth import services as auth_services # Alias to avoid name clash
from Backend.Core.Security.jwt import create_access_token
from Backend.Config.Settings import settings # For access_token_expire_minutes
# UserTenant schema might be needed if returning user details post-login, but Token is the primary response
# from Backend.Core.Auth.Schemas import UserTenant

router = APIRouter(prefix='/auth', tags=['auth'])

# The /register endpoint is removed as per instructions.
# User creation will be handled by a dedicated Users module.

@router.post("/login", response_model=Schemas.Token)
async def login_for_access_token(
    login_request: Schemas.LoginRequest, # Using Pydantic model for request body
    x_tenant_id: Annotated[UUID | None, Header(alias="X-Tenant-ID")] = None,
    db: Session = Depends(get_db)
):
    if x_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Tenant-ID header is required for login."
        )

    user = auth_services.authenticate_user(
        db,
        tenant_id=x_tenant_id,
        email=login_request.email,
        password=login_request.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password for the specified tenant.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

    # Ensure tenant_id and role are strings for JWT standard claims if they aren't already
    # user.tenant_id is UUID, user.role is Enum
    token_data = {
        "sub": user.email,
        "tenant_id": str(user.tenant_id), # Convert UUID to string for JWT
        "role": user.role.value # Convert Enum to string value for JWT
    }

    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/enhanced-login", response_model=Schemas.EnhancedToken)
async def enhanced_login_for_access_token(
    login_request: Schemas.EnhancedLoginRequest,
    db: Session = Depends(get_db)
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
    user, error_message = auth_services.enhanced_authenticate_user(
        db,
        email=login_request.email,
        password=login_request.password,
        tenant_id=login_request.tenant_id
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

    # Ensure tenant_id and role are strings for JWT standard claims if they aren't already
    # user.tenant_id is UUID, user.role is Enum
    token_data = {
        "sub": user.email,
        "tenant_id": str(user.tenant_id), # Convert UUID to string for JWT
        "role": user.role.value # Convert Enum to string value for JWT
    }

    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "tenant_id": user.tenant_id
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
