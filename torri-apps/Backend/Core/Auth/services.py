from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text
from Core.Auth.models import UserTenant # Adjusted import path
from Modules.Tenants.models import Tenant
# Schemas will be used for type hinting and response models, but UserTenantCreate is not directly used here
# from Core.Auth.Schemas import UserTenantCreate
from Core.Security.hashing import verify_password
# settings might be used for other auth-related configurations in the future
# from Config.Settings import settings
# create_access_token is used in routes, not directly in this service function for authentication logic
# from Core.Security.jwt import create_access_token
# HTTPException is typically raised in routes, services usually return data or None/False
# from fastapi import HTTPException
from Core.Audit import log_audit, AuditLogEvent # Import audit logging utilities

def authenticate_user(db: Session, tenant_id: UUID, email: str, password: str) -> tuple[UserTenant | None, str | None]:
    """
    Authenticates a user by email and password for a specific tenant.

    Args:
        db: SQLAlchemy database session.
        tenant_id: The ID of the tenant to authenticate against.
        email: User's email.
        password: User's plain text password.

    Returns:
        Tuple of (UserTenant object or None, tenant_schema_name or None).
    """
    try:
        # First, get the tenant's schema name from the public tenants table
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        # If not found, try explicit public schema query
        if not tenant:
            tenant_result = db.execute(text("SELECT id, name, db_schema_name FROM torri_app_public.tenants WHERE id = :tenant_id"), 
                                     {"tenant_id": str(tenant_id)}).fetchone()
            if tenant_result:
                # Use the raw result since ORM failed
                schema_name = tenant_result[2]  # db_schema_name is at index 2
            else:
                log_audit(
                    event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                    requesting_user_email=email,
                    tenant_id=tenant_id,
                    details={"reason": f"Tenant {tenant_id} not found."}
                )
                return None, None
        else:
            schema_name = tenant.db_schema_name
        
        # Use raw SQL with explicit schema name since ORM schema switching doesn't work
        result = db.execute(
            text(f"SELECT id, tenant_id, email, hashed_password, role, full_name, is_active FROM `{schema_name}`.users_tenant WHERE email = :email AND tenant_id = :tenant_id AND is_active = 1"),
            {"email": email, "tenant_id": str(tenant_id)}
        ).fetchone()
        
        if not result:
            log_audit(
                event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                requesting_user_email=email,
                tenant_id=tenant_id,
                details={"reason": f"User with email {email} not found in tenant {tenant_id}."}
            )
            return None, None
        
        # Verify password
        if not verify_password(password, result[3]):  # hashed_password is at index 3
            log_audit(
                event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                requesting_user_email=email,
                tenant_id=tenant_id,
                details={"reason": "Incorrect password."}
            )
            return None, None
        
        # Create UserTenant object from raw result
        from Core.Auth.constants import UserRole
        user = UserTenant()
        user.id = result[0]
        user.tenant_id = UUID(result[1]) 
        user.email = result[2]
        user.hashed_password = result[3]
        user.role = UserRole(result[4].upper())  # Convert to uppercase to match enum
        user.full_name = result[5]
        user.is_active = result[6]
        
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_SUCCESS,
            requesting_user_id=user.id,
            requesting_user_email=user.email,
            tenant_id=user.tenant_id
        )
        return user, schema_name
        
    except Exception as e:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email,
            tenant_id=tenant_id,
            details={"reason": f"Database error: {str(e)}"}
        )
        return None, None

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
            query = text(f"SELECT tenant_id FROM `{schema_name}`.users_tenant WHERE email = :email AND is_active = 1")
            
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

def enhanced_authenticate_user(db: Session, email: str, password: str, tenant_id: UUID | None = None) -> tuple[UserTenant | None, str | None, str | None]:
    """
    SIMPLIFIED: Single schema authentication.
    No tenant discovery needed - all users are in the same schema.
    
    Args:
        db: SQLAlchemy database session.
        email: User's email.
        password: User's plain text password.
        tenant_id: Ignored in single schema mode.
    
    Returns:
        Tuple of (UserTenant object or None, error_message or None, schema_name or None)
        - Success: (UserTenant, None, schema_name)
        - Failure: (None, error_message, None)
    """
    try:
        # SIMPLIFIED: Direct query in single schema
        user = db.query(UserTenant).filter(
            UserTenant.email == email,
            UserTenant.is_active == True
        ).first()
        
        if not user:
            log_audit(
                event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                requesting_user_email=email,
                details={"reason": f"User with email {email} not found."}
            )
            return None, "Email not found.", None
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            log_audit(
                event_type=AuditLogEvent.USER_LOGIN_FAILURE,
                requesting_user_email=email,
                details={"reason": "Incorrect password."}
            )
            return None, "Incorrect password.", None
        
        # Success
        from Config.Settings import settings
        schema_name = settings.default_schema_name
        
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_SUCCESS,
            requesting_user_id=user.id,
            requesting_user_email=user.email,
            tenant_id=user.tenant_id,
            details={"method": "single_schema_login"}
        )
        return user, None, schema_name
        
    except Exception as e:
        log_audit(
            event_type=AuditLogEvent.USER_LOGIN_FAILURE,
            requesting_user_email=email,
            details={"reason": f"Database error: {str(e)}"}
        )
        return None, f"Authentication error: {str(e)}", None

# (Opcional, para depois) Criar função `create_user_tenant(db: Session, user: UserTenantCreate, tenant_id: UUID) -> UserTenant`:
# *   Esta função será mais apropriada no `Modules/Users/services.py`. Por enquanto, o foco do `Auth/services.py` é autenticação.
