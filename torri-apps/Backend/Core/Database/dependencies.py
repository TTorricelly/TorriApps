from fastapi import Request, HTTPException, status
from sqlalchemy import text
from Config.Database import SessionLocal
from Config.Settings import settings # To potentially reset to a default public schema if needed

def get_db(request: Request): # Add request: Request parameter
    tenant_schema_name = getattr(request.state, "tenant_schema_name", None)
    
    # Create a fresh session for each request to avoid connection pool corruption
    db = SessionLocal()
    
    # If tenant_schema_name is set by the middleware, attempt to switch the schema for this session.
    # This applies to tenant-specific routes.
    if tenant_schema_name: # and not use_public_schema: (use_public_schema implies tenant_schema_name would be None)
        try:
            # Force schema switch with explicit commit to ensure it takes effect
            db.execute(text(f"USE `{tenant_schema_name}`;"))
            db.commit()  # Ensure the schema switch is committed immediately
            
            # Verify the schema switch worked by checking current database
            result = db.execute(text("SELECT DATABASE();")).scalar()
            if result != tenant_schema_name:
                raise Exception(f"Schema switch failed. Expected {tenant_schema_name}, got {result}")
                
        except Exception as e:
            try:
                db.rollback() # Rollback before closing due to error
                db.close()
            except:
                pass  # Ignore errors during cleanup
            # Log the error 'e' server-side for diagnostics
            print(f"Critical: Could not switch to tenant schema '{tenant_schema_name}'. Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not access tenant services. Please contact support."
                # detail=f"Could not switch to tenant schema: {tenant_schema_name}. Error: {e}" # Too verbose for client
            )
    # else:
        # If tenant_schema_name is None, it implies either:
        # 1. It's a public route (request.state.use_public_schema might be True).
        #    The session `db` will use the default database configured in the engine's URL.
        #    This should be the public schema where tables like 'tenants', 'admin_master_users' reside.
        #    SQLAlchemy models for public tables (TenantModel, AdminMasterUser) already specify their schema
        #    via `__table_args__ = {"schema": settings.default_schema_name}`.
        #    This allows SQLAlchemy to correctly qualify table names (e.g., `public.tenants`)
        #    even if the current session's default schema is a tenant's schema (after a `USE` command).
        #
        # 2. Or, an error occurred in middleware before tenant_schema_name could be set (e.g., X-Tenant-ID missing).
        #    In such cases, the middleware should have already returned an error response.
        #    If the request still reaches here without tenant_schema_name and it's not a public route,
        #    it's an unexpected state, but get_db would provide a session to the default (public) schema.

    try:
        yield db
    except Exception as e:
        # Handle any exceptions during the request
        print(f"Exception in database session: {e}")
        try:
            db.rollback()  # Rollback any pending changes
        except Exception as rollback_error:
            print(f"Error during rollback: {rollback_error}")
        raise  # Re-raise the original exception
    finally:
        # Regarding resetting the schema (e.g., `USE public_db_name`) after a request:
        # When a SQLAlchemy session is closed (`db.close()`), the underlying DB connection
        # is typically returned to the connection pool.
        # The `USE tenant_schema` statement affects the state of that specific connection.
        # If that connection is reused by another request (even for the public schema or another tenant),
        # it might still be in the context of the previous tenant's schema if not reset.
        # This can lead to data leakage or errors.
        #
        # Strategies:
        # 1. Engine URL without specific DB: If `settings.database_url` is just `mysql+mysqlconnector://user:pass@host/`,
        #    then `USE schema_name` is necessary for both tenant and public operations (e.g. `USE public`).
        #    In this case, always setting the schema (tenant or public) at the start is clean.
        # 2. Engine URL with public DB: If `settings.database_url` is `mysql+mysqlconnector://user:pass@host/public_db`,
        #    then after a `USE tenant_schema`, the connection should be reset to `USE public_db` before returning to pool.
        #
        # For now, let's assume the latter, and that `settings.default_schema_name` is the one in the engine URL.
        # However, simply closing might be sufficient if the pool discards/resets session state. This is DB driver specific.
        # Always reset to public schema after tenant operations to prevent connection state issues
        if tenant_schema_name:
            try:
                # Force reset connection to public schema to prevent connection pool corruption
                db.execute(text(f"USE `{settings.default_schema_name}`;"))
                db.commit()  # Ensure the schema change is committed
            except Exception as e:
                # Log this error, as it might affect connection reuse
                print(f"Warning: Could not reset schema to '{settings.default_schema_name}' for connection. Error: {e}")
                # If we can't reset the schema, this connection is corrupted - force close it
                try:
                    db.rollback()
                    # Force invalidate this connection from the pool
                    db.connection().invalidate()
                except Exception as rollback_error:
                    print(f"Error during final rollback: {rollback_error}")
        
        try:
            db.close()
        except Exception as close_error:
            print(f"Error closing database session: {close_error}")
            # If close fails, try to invalidate the connection to prevent pool corruption
            try:
                db.connection().invalidate()
            except:
                pass

def get_public_db():
    """
    Get a database session specifically for public schema operations.
    This is used for accessing tenant metadata and other public schema tables.
    """
    db = SessionLocal()
    try:
        # For multi-tenant setup, ensure we're using the public schema
        # Only do this if we're not already connected to the right database
        if settings.default_schema_name and settings.default_schema_name != "public":
            try:
                db.execute(text(f"USE `{settings.default_schema_name}`;"))
            except Exception as use_error:
                print(f"Warning: Could not switch to schema {settings.default_schema_name}: {use_error}")
                # Continue without schema switch - might already be on correct schema
        
        yield db
    except Exception as e:
        db.rollback()
        db.close()
        print(f"Error in get_public_db: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection error"
        )
    finally:
        db.close()
