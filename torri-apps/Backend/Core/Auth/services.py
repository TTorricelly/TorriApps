from uuid import UUID
from sqlalchemy.orm import Session
from Backend.Core.Auth.models import UserTenant # Adjusted import path
# Schemas will be used for type hinting and response models, but UserTenantCreate is not directly used here
# from Backend.Core.Auth.Schemas import UserTenantCreate
from Backend.Core.Security.hashing import verify_password
# settings might be used for other auth-related configurations in the future
# from Backend.Config.Settings import settings
# create_access_token is used in routes, not directly in this service function for authentication logic
# from Backend.Core.Security.jwt import create_access_token
# HTTPException is typically raised in routes, services usually return data or None/False
# from fastapi import HTTPException
from Backend.Core.Audit import log_audit, AuditLogEvent # Import audit logging utilities

def authenticate_user(db: Session, tenant_id: UUID, email: str, password: str) -> UserTenant | None:
    """
    Authenticates a user by email and password for a specific tenant.

    Args:
        db: SQLAlchemy database session.
        tenant_id: The ID of the tenant to authenticate against.
        email: User's email.
        password: User's plain text password.

    Returns:
        The authenticated UserTenant object or None if authentication fails.
    """
    # Query for the user by email and tenant_id
    # Note: The UserTenant model has a UniqueConstraint for (tenant_id, email),
    # so this should return at most one user.
    user = db.query(UserTenant).filter(
        UserTenant.email == email,
        UserTenant.tenant_id == tenant_id
    ).first()

    if not user:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email, # email is known from input
            tenant_id=tenant_id, # tenant_id is known from input
            details={"reason": f"User with email {email} not found in tenant {tenant_id}."}
        )
        return None  # User not found for this tenant and email

    if not verify_password(password, user.hashed_password):
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_id=user.id, # user object is available here
            requesting_user_email=user.email,
            tenant_id=user.tenant_id,
            details={"reason": "Incorrect password."}
        )
        return None  # Incorrect password

    log_audit(
        event_type=AuditLogEvent.USER_LOGIN_SUCCESS,
        requesting_user_id=user.id,
        requesting_user_email=user.email,
        tenant_id=user.tenant_id
    )
    return user

# (Opcional, para depois) Criar função `create_user_tenant(db: Session, user: UserTenantCreate, tenant_id: UUID) -> UserTenant`:
# *   Esta função será mais apropriada no `Modules/Users/services.py`. Por enquanto, o foco do `Auth/services.py` é autenticação.
