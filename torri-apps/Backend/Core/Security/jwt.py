import warnings
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from pydantic import ValidationError # For handling potential errors in token data

from Config.Settings import settings # Adjusted import path
from Core.Auth.constants import UserRole # Adjusted import path

ALGORITHM = "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES is already available via settings.access_token_expire_minutes

# Schema for the data within the JWT token (payload)
# This can be expanded as needed.
# Using a Pydantic model for this helps with validation when decoding.
from pydantic import BaseModel, EmailStr
from typing import Optional

class TokenPayload(BaseModel):
    sub: EmailStr # Subject (standard claim for user identifier)
    role: UserRole
    exp: datetime # Expiration time (standard claim)
    
    # Enhanced user data to avoid database calls (optional for backward compatibility)
    user_id: Optional[str] = None # User UUID as string
    full_name: Optional[str] = None # User's full name
    is_active: Optional[bool] = True # User active status - defaults to True for old tokens
    
    # Optional: Add more user data if needed
    # phone: Optional[str] = None
    # avatar_url: Optional[str] = None

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})

    # Ensure all data is serializable (e.g., convert UUID to str if present in 'data' before this point)
    # For common fields like 'sub', 'tenant_id', 'role', ensure they are basic types.
    # Example: if data contains UUID, convert it: to_encode["some_uuid_field"] = str(to_encode["some_uuid_field"])

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> TokenPayload | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])

        # Validate the payload structure using Pydantic model
        token_data = TokenPayload(**payload)

        # Skip expiration check for persistent login
        # Tokens will remain valid indefinitely

        return token_data
    except JWTError as e: # Covers various issues like invalid signature, malformed token
        # Log the error e for debugging
        print(f"JWTError during token decoding: {e}") # Replace with proper logging
        return None # Or raise HTTPException(status_code=401, detail="Invalid token")
    except ValidationError as e: # Pydantic validation error for payload
        # Log the error e for debugging
        print(f"Token payload validation error: {e}") # Replace with proper logging
        return None # Or raise HTTPException(status_code=401, detail="Invalid token data")
    except Exception as e: # Catch any other unexpected errors
        # Log the error e
        print(f"Unexpected error during token decoding: {e}") # Replace with proper logging
        return None
