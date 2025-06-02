from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError # For catching JWT specific errors

# Adjust relative paths based on actual execution context if needed
from Core.Security.jwt import decode_access_token, TokenPayload # Assuming TokenPayload is in jwt.py
from Core.Auth.Schemas import TokenData # TokenData might be redundant if TokenPayload is used from jwt.py
from Core.Auth.models import UserTenant
# The service to fetch user by email and tenant_id
from Modules.Users.services import get_user_by_email_and_tenant
from Core.Database.dependencies import get_db
from Core.Auth.constants import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login") # Corrected path as per previous setup

def get_current_user_tenant(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
    # X-Tenant-ID is crucial for context, ensuring the user is operating within the intended tenant.
    x_tenant_id: Annotated[UUID | None, Header(alias="X-Tenant-ID")] = None
) -> UserTenant:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    tenant_id_mismatch_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Tenant ID mismatch between header and token. Access denied.",
    )
    invalid_tenant_in_token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing tenant ID in token.",
    )
    header_tenant_id_required_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="X-Tenant-ID header is required for this operation.",
    )

    if x_tenant_id is None:
        raise header_tenant_id_required_exception

    try:
        payload: TokenPayload | None = decode_access_token(token) # Expecting TokenPayload from decode
        if payload is None or not isinstance(payload, TokenPayload): # Check if decode failed or returned unexpected type
            raise credentials_exception

        email: str | None = payload.sub
        token_tenant_id_str: str | None = payload.tenant_id
        # role_str: UserRole | None = payload.role # Role is already UserRole type due to TokenPayload

        if email is None:
            raise credentials_exception
        if token_tenant_id_str is None:
            raise invalid_tenant_in_token_exception

        try:
            token_tenant_id = UUID(token_tenant_id_str)
        except ValueError:
            raise invalid_tenant_in_token_exception

        # Critical Check: Ensure header X-Tenant-ID matches the tenant_id in the token
        if token_tenant_id != x_tenant_id:
            raise tenant_id_mismatch_exception

    except JWTError: # Catch errors from jwt.decode specifically
        raise credentials_exception
    # Catch Pydantic validation error if TokenPayload was invalid from decode_access_token
    except Exception as e: # Catch any other error during payload processing
        # Log e for server-side diagnostics
        print(f"Unexpected error in get_current_user_tenant: {e}")
        raise credentials_exception

    # Fetch user from DB based on email from token and tenant_id from token (which matched header)
    user = get_user_by_email_and_tenant(db, email=email, tenant_id=token_tenant_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # Changed to 404 as user for token not found
            detail="User not found for the provided token and tenant.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    return user

def require_role(required_roles: List[UserRole]):
    """
    Dependency that checks if the current user has one of the required roles.
    """
    def role_checker(current_user: Annotated[UserTenant, Depends(get_current_user_tenant)]) -> UserTenant:
        if not current_user.role: # Should not happen if user model and token are valid
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User role not set.")
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. User role '{current_user.role.value}' is not in required roles: {[r.value for r in required_roles]}."
            )
        return current_user
    return role_checker
