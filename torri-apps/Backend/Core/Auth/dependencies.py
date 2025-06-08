from typing import Annotated, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from Core.Security.jwt import decode_access_token, TokenPayload
from Core.Auth.models import User # Updated import
from Core.Database.dependencies import get_db
from Core.Auth.constants import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_token_payload(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> TokenPayload:
    """
    SIMPLIFIED: Validate JWT token and return payload for single schema.
    No tenant validation needed anymore.
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

        if email is None:
            raise credentials_exception

        return payload

    except JWTError as e:
        print(f"JWTError during token decoding: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_token_payload: {e}")
        import traceback
        traceback.print_exc()
        raise credentials_exception

def get_current_user_tenant(
    payload: Annotated[TokenPayload, Depends(get_current_token_payload)]
) -> TokenPayload:
    """
    SIMPLIFIED: Get current user data from JWT payload only.
    No database calls needed for single schema architecture.
    """
    
    # For single schema, we trust the JWT payload completely
    if payload.is_active is not None and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    
    return payload

def get_current_user_from_db(
    payload: Annotated[TokenPayload, Depends(get_current_token_payload)],
    db: Annotated[Session, Depends(get_db)]
) -> User: # Updated return type
    """
    Get current user from database when you need fresh data or relationships.
    Simplified for single schema - no tenant_id matching needed.
    """
    try:
        user = db.query(User).filter( # Updated model
            User.email == payload.sub # Updated model
        ).first()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found for the provided token.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Inactive user"
            )

        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not validate user credentials"
        )

# Compatibility alias for existing code
def get_current_user_from_token(
    payload: Annotated[TokenPayload, Depends(get_current_token_payload)]
) -> TokenPayload:
    """
    Compatibility function for existing code.
    """
    return get_current_user_tenant(payload)

def require_role(required_roles: List[UserRole]):
    """
    Dependency that checks if the current user has one of the required roles.
    """
    def role_checker(current_user: Annotated[TokenPayload, Depends(get_current_user_tenant)]) -> TokenPayload:
        if not current_user.role:
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                 detail="User role not set."
             )
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. User role '{current_user.role.value}' is not in required roles: {[r.value for r in required_roles]}."
            )
        return current_user
    return role_checker
