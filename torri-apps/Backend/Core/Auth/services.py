from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text
from Backend.Core.Auth.models import UserTenant # Adjusted import path
from Backend.Modules.Tenants.models import Tenant
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

def discover_tenant_by_email(db: Session, email: str) -> list[UUID]:
    """
    Discovers which tenant(s) contain a user with the given email.
    
    Args:
        db: SQLAlchemy database session.
        email: User's email to search for.
    
    Returns:
        List of tenant_ids where the email exists. 
        Empty list if email not found in any tenant.
    """
    try:
        # Get all tenant schemas from the public tenants table
        tenants = db.query(Tenant).all()
        found_tenant_ids = []
        
        for tenant in tenants:
            # Sanitize schema name to prevent SQL injection
            schema_name = tenant.db_schema_name
            # Basic validation - schema names should be alphanumeric with underscores only
            if not schema_name.replace('_', '').replace('-', '').isalnum():
                log_audit(
                    event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                    requesting_user_email=email,
                    details={"reason": f"Invalid schema name detected: {schema_name}"}
                )
                continue
                
            # Use parameterized query to safely check for email in each tenant schema
            # Note: We cannot parameterize table/schema names, but we validated the schema name above
            query = text(f"SELECT tenant_id FROM `{schema_name}`.user_tenant WHERE email = :email AND is_active = 1")
            
            try:
                result = db.execute(query, {"email": email}).fetchone()
                if result:
                    found_tenant_ids.append(UUID(result[0]))
            except Exception as e:
                # Log but continue - schema might not exist or be accessible
                log_audit(
                    event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                    requesting_user_email=email,
                    details={"reason": f"Error querying schema {schema_name}: {str(e)}"}
                )
                continue
                
        return found_tenant_ids
        
    except Exception as e:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email,
            details={"reason": f"Error during tenant discovery: {str(e)}"}
        )
        return []

def enhanced_authenticate_user(db: Session, email: str, password: str, tenant_id: UUID | None = None) -> tuple[UserTenant | None, str | None]:
    """
    Enhanced authentication that can discover tenant by email if tenant_id is not provided.
    
    Args:
        db: SQLAlchemy database session.
        email: User's email.
        password: User's plain text password.
        tenant_id: Optional tenant_id. If not provided, will search for email across tenants.
    
    Returns:
        Tuple of (UserTenant object or None, error_message or None)
        - Success: (UserTenant, None)
        - Failure: (None, error_message)
    """
    # If tenant_id is provided, use the existing authentication method
    if tenant_id:
        user = authenticate_user(db, tenant_id, email, password)
        if user:
            return user, None
        else:
            return None, "Incorrect email or password for the specified tenant."
    
    # Tenant discovery flow
    found_tenant_ids = discover_tenant_by_email(db, email)
    
    if len(found_tenant_ids) == 0:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email,
            details={"reason": "Email not found in any tenant."}
        )
        return None, "Email not found."
    
    if len(found_tenant_ids) > 1:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email,
            details={"reason": f"Email found in {len(found_tenant_ids)} tenants. Tenant ID required."}
        )
        return None, "Email found in multiple tenants. Please specify your tenant."
    
    # Exactly one tenant found - proceed with authentication
    discovered_tenant_id = found_tenant_ids[0]
    user = authenticate_user(db, discovered_tenant_id, email, password)
    
    if user:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_SUCCESS,
            requesting_user_id=user.id,
            requesting_user_email=user.email,
            tenant_id=user.tenant_id,
            details={"method": "enhanced_login_with_tenant_discovery"}
        )
        return user, None
    else:
        return None, "Incorrect password."

# (Opcional, para depois) Criar função `create_user_tenant(db: Session, user: UserTenantCreate, tenant_id: UUID) -> UserTenant`:
# *   Esta função será mais apropriada no `Modules/Users/services.py`. Por enquanto, o foco do `Auth/services.py` é autenticação.
