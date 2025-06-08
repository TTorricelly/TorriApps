from sqlalchemy.orm import Session
from Core.Auth.models import User # Adjusted import path
# Schemas will be used for type hinting and response models, but UserCreate is not directly used here
# from Core.Auth.Schemas import UserCreate
from Core.Security.hashing import verify_password
# create_access_token is used in routes, not directly in this service function for authentication logic
# from Core.Security.jwt import create_access_token
# HTTPException is typically raised in routes, services usually return data or None/False
# from fastapi import HTTPException
# Removed audit logging imports
# Removed Tenant import as it's no longer needed
# from Modules.Tenants.models import Tenant
# Removed settings import as it's no longer needed for default_schema_name
# from Config.Settings import settings


def authenticate_user(db: Session, email: str, password: str) -> tuple[User | None, str | None]:
    """
    Authenticates a user by email and password.
    All users are in the same schema.
    
    Args:
        db: SQLAlchemy database session.
        email: User's email.
        password: User's plain text password.
    
    Returns:
        Tuple of (User object or None, error_message or None)
        - Success: (User, None)
        - Failure: (None, error_message)
    """
    try:
        # Direct query in single schema
        user = db.query(User).filter(
            User.email == email,
            User.is_active == True
        ).first()
        
        if not user:
            return None, "Email not found."
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            return None, "Incorrect password."
        
        # Success
        return user, None
        
    except Exception as e:
        return None, f"Authentication error: {str(e)}"

# (Opcional, para depois) Criar função `create_user(db: Session, user: UserCreate) -> User`:
# *   Esta função será mais apropriada no `Modules/Users/services.py`. Por enquanto, o foco do `Auth/services.py` é autenticação.
