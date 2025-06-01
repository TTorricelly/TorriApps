from fastapi import Request, HTTPException, status
from sqlalchemy import text
from Backend.Config.Database import SessionLocal
from Backend.Config.Settings import settings # To potentially reset to a default public schema if needed

def get_db(request: Request): # Add request: Request parameter
    db = SessionLocal()

    tenant_schema_name = getattr(request.state, "tenant_schema_name", None)
    # use_public_schema = getattr(request.state, "use_public_schema", False) # Set by Middleware

    # If tenant_schema_name is set by the middleware, attempt to switch the schema for this session.
    # This applies to tenant-specific routes.
    if tenant_schema_name: # and not use_public_schema: (use_public_schema implies tenant_schema_name would be None)
        try:
            # For MySQL, 'USE database_name' changes the default database for the current connection.
            # Ensure the db_schema_name is sanitized or trusted. Here it comes from our DB.
            # Using backticks for safety, though not strictly necessary if schema names are controlled.
            db.execute(text(f"USE `{tenant_schema_name}`;"))
        except Exception as e:
            db.rollback() # Rollback before closing due to error
            db.close()
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
        # A safer explicit reset for MySQL if USE was called:
        if tenant_schema_name: # If we switched schema
             try:
                 # This attempts to reset the connection's default database to the public schema.
                 # Requires `default_schema_name` to be the actual name of the database in the engine URL.
                 db.execute(text(f"USE `{settings.default_schema_name}`;"))
             except Exception as e:
                 # Log this error, as it might affect connection reuse.
                 print(f"Warning: Could not reset schema to '{settings.default_schema_name}' for connection. Error: {e}")
        db.close()
