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
from Core.Database.dependencies import get_db, get_public_db
from Core.Auth.constants import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login") # Full path including API prefix

def get_current_user_from_token(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> UserTenant:
    """
    Get current user from JWT token only, without requiring X-Tenant-ID header.
    Uses tenant_schema from JWT token for direct access.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: TokenPayload | None = decode_access_token(token)
        if payload is None or not isinstance(payload, TokenPayload):
            raise credentials_exception

        email: str | None = payload.sub
        token_tenant_id_str: str | None = payload.tenant_id
        tenant_schema: str | None = payload.tenant_schema

        if email is None or token_tenant_id_str is None or tenant_schema is None:
            raise credentials_exception

        try:
            token_tenant_id = UUID(token_tenant_id_str)
        except ValueError:
            raise credentials_exception

    except JWTError:
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user_from_token: {e}")
        raise credentials_exception

    # Create a temporary DB session to fetch user data
    # We now have tenant_schema directly from JWT token - no need to construct it!
    from Config.Database import SessionLocal
    from sqlalchemy import text
    
    db_temp = SessionLocal()
    try:
        # Switch to the user's tenant schema using schema name from JWT
        db_temp.execute(text(f"USE `{tenant_schema}`;"))
        
        # Fetch user from the tenant schema  
        # Use string comparison since database stores tenant_id as CHAR(36)
        user = db_temp.query(UserTenant).filter(
            UserTenant.email == email, 
            UserTenant.tenant_id == str(token_tenant_id)
        ).first()
        
        if user is None:
            print(f"User not found. Let's check what users exist:")
            # Debug: Check what users exist in this schema
            all_users = db_temp.query(UserTenant).all()
            print(f"All users in schema: {[(u.email, u.tenant_id, u.role) for u in all_users]}")
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found for the provided token.",
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

        return user
        
    except Exception as e:
        print(f"Error fetching user from token: {e}")
        print(f"Email: {email}, Tenant ID: {token_tenant_id}, Schema: {tenant_schema}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not validate user credentials: {str(e)}"
        )
    finally:
        db_temp.close()

def get_current_user_tenant(
    current_user: Annotated[UserTenant, Depends(get_current_user_from_token)]
) -> UserTenant:
    """
    Wrapper for get_current_user_from_token for backwards compatibility.
    Now both functions work identically using JWT token optimization.
    """
    return current_user

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
