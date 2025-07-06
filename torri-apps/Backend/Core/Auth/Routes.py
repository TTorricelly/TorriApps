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

router = APIRouter(tags=['auth'])

# The /register endpoint is removed as per instructions.
# User creation will be handled by a dedicated Users module.

@router.post("/login", response_model=Schemas.Token)
async def login_for_access_token(
    login_request: Schemas.LoginRequest, # Using Pydantic model for request body
    db: Session = Depends(get_db)  # SIMPLIFIED: Use single schema DB
):

    user, error_message = auth_services.authenticate_user( # Renamed and simplified call
        db,
        email_or_phone=login_request.email_or_phone,
        password=login_request.password
        # tenant_id argument removed
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
        # tenant_id and tenant_schema removed
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

# The /enhanced-login route has been removed.

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
