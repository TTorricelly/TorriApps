from uuid import UUID
from fastapi import HTTPException, Response as FastAPIResponse # Using FastAPI Response for convenience
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.orm import Session # For type hinting
from sqlalchemy import text # For executing raw SQL if necessary for schema switching

from Config.Database import SessionLocal # For creating a DB session to query public tenant table
from Config.Settings import settings
from Modules.Tenants.models import Tenant as TenantModel # To query for db_schema_name

# Define public route prefixes that do not require X-Tenant-ID or schema switching
# These routes will use the default public schema.
# Note: With the global API_V1_PREFIX, paths like /auth/login become /api/v1/auth/login.
# The FastAPI default /docs and /openapi.json are typically at the root,
# unless the FastAPI app itself is mounted under a subpath.
PUBLIC_ROUTE_PREFIXES = [
    "/docs",                # FastAPI's default OpenAPI docs UI
    "/openapi.json",        # FastAPI's default OpenAPI schema
    "/health",              # Health check endpoint defined in main.py at root
    # TODO: Confirm if root_health_check "/" is also needed here if it's not caught by docs
    "/api/v1/auth/login",   # Login route is public; tenant context from X-Tenant-ID
    # Add other public API prefixes under /api/v1 as needed:
    # e.g., "/api/v1/tenants" (if Tenant CRUD is public/admin)
    # e.g., "/api/v1/adminmaster/"
    # For now, keeping it minimal. If /tenants CRUD is added and public, its prefix needs to be here.
]
# It's important that these prefixes accurately reflect the final URL structure.

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.tenant_id = None
        request.state.tenant_schema_name = None
        request.state.use_public_schema = False # Default to not using public schema explicitly

        is_public_route = any(request.url.path.startswith(prefix) for prefix in PUBLIC_ROUTE_PREFIXES)

        if is_public_route:
            request.state.use_public_schema = True
            # No X-Tenant-ID or schema switching needed for these routes.
            # Operations will use models with `__table_args__ = {"schema": settings.default_schema_name}`
            # or the default DB connection if engine points to public schema.
            response = await call_next(request)
            return response

        # If not a public route, it's a tenant-specific route. X-Tenant-ID is required.
        x_tenant_id_str = request.headers.get("X-Tenant-ID")

        if not x_tenant_id_str:
            # Using FastAPIResponse for JSON error, standard Response might be text/plain
            return FastAPIResponse(
                content={"detail": "X-Tenant-ID header is required for this route."},
                status_code=400
            )

        try:
            tenant_uuid = UUID(x_tenant_id_str)
        except ValueError:
            return FastAPIResponse(
                content={"detail": "Invalid X-Tenant-ID format. Must be a valid UUID."},
                status_code=400
            )

        # Fetch tenant's db_schema_name from the public 'tenants' table.
        # This requires a database session that is guaranteed to be on the public schema.
        db_public: Session = SessionLocal() # Create a new session for this lookup

        # Ensure this session uses the public schema.
        # If engine URL includes a DB, and it's the public one, this is fine.
        # If engine URL does not include a DB, we might need to `USE public_db` or rely on models
        # having schema defined for cross-schema query to work.
        # The TenantModel is defined in BasePublic and has `__table_args__ = {"schema": settings.default_schema_name}`
        # This should make SQLAlchemy query `public.tenants`.

        try:
            tenant_info = db_public.query(TenantModel.db_schema_name).filter(TenantModel.id == tenant_uuid).first()
        except Exception as e:
            # Log the exception e
            db_public.close()
            return FastAPIResponse(
                content={"detail": f"Error querying tenant information: {str(e)}"},
                status_code=500 # Internal Server Error
            )
        finally:
            db_public.close() # Always close the session used for this lookup

        if not tenant_info:
            return FastAPIResponse(
                content={"detail": f"Tenant with ID '{tenant_uuid}' not found or has no schema configured."},
                status_code=404 # Not Found
            )

        db_schema_name_for_tenant = tenant_info.db_schema_name

        # Store tenant info in request state for get_db and other dependencies to use
        request.state.tenant_id = tenant_uuid
        request.state.tenant_schema_name = db_schema_name_for_tenant
        request.state.use_public_schema = False # Explicitly false for tenant routes

        # The actual schema switching (e.g., "USE tenant_xyz;") will be handled in get_db
        # based on request.state.tenant_schema_name.

        response = await call_next(request)
        return response
