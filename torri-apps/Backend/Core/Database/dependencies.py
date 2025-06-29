from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from Config.Database import SessionLocal
from Config.Settings import settings


def get_public_db() -> Session:
    """
    Get database session for public schema operations.
    Used for tenant management and authentication.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"Exception in public database session: {e}")
        try:
            db.rollback()  # Rollback any pending changes
        except Exception as rollback_error:
            print(f"Error during rollback: {rollback_error}")
        raise  # Re-raise the original exception
    finally:
        try:
            db.close()
        except Exception as close_error:
            print(f"Error closing public database session: {close_error}")


def get_tenant_db(schema_name: str) -> Session:
    """
    Get database session for a specific tenant schema.
    
    Args:
        schema_name: The tenant's database schema name
        
    Returns:
        Session: Database session configured for the tenant schema
    """
    # Create tenant-specific database URL
    tenant_url = settings.tenant_url_template.format(schema=schema_name)
    
    # Create engine for this tenant
    tenant_engine = create_engine(
        tenant_url,
        pool_pre_ping=True,
        pool_recycle=900,
        pool_size=settings.tenant_engine_pool_size,
        max_overflow=2,
        pool_reset_on_return='commit',
        pool_timeout=60,
        echo=False
    )
    
    # Create session factory
    TenantSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
    
    db = TenantSessionLocal()
    try:
        # Set search path to tenant schema first, then public
        db.execute(text(f"SET search_path TO {schema_name}, public"))
        yield db
    except Exception as e:
        print(f"Exception in tenant database session: {e}")
        try:
            db.rollback()
        except Exception as rollback_error:
            print(f"Error during rollback: {rollback_error}")
        raise
    finally:
        try:
            db.close()
        except Exception as close_error:
            print(f"Error closing tenant database session: {close_error}")
        finally:
            # Clean up the engine
            tenant_engine.dispose()


def get_db() -> Session:
    """
    Get database session with automatic tenant context switching.
    
    This function checks if there's a tenant context set by the TenantMiddleware
    and returns the appropriate database session (tenant-specific or public).
    """
    # Import here to avoid circular imports
    from Core.Middleware.tenant import get_current_schema_name
    
    schema_name = get_current_schema_name()
    
    if schema_name:
        # Return tenant-specific database session
        yield from get_tenant_db(schema_name)
    else:
        # Return public database session
        yield from get_public_db()


# Backwards compatibility
def get_current_user_tenant():
    """Legacy compatibility function."""
    from Core.Middleware.tenant import get_current_tenant
    return get_current_tenant()
