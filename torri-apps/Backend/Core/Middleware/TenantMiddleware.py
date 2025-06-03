from uuid import UUID
from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from sqlalchemy.orm import Session # For type hinting
from sqlalchemy import text # For executing raw SQL if necessary for schema switching

from Config.Database import SessionLocal # For creating a DB session to query public tenant table
from Config.Settings import settings
from Modules.Tenants.models import Tenant as TenantModel # To query for db_schema_name
from Core.Security.jwt import decode_access_token # For JWT token decoding

# Define public route prefixes that do not require X-Tenant-ID or schema switching
# These routes will use the default public schema.
# Note: With the global API_V1_PREFIX, paths like /auth/login become /api/v1/auth/login.
# The FastAPI default /docs and /openapi.json are typically at the root,
# unless the FastAPI app itself is mounted under a subpath.
PUBLIC_ROUTE_PREFIXES = [
    "/docs",                        # FastAPI's default OpenAPI docs UI
    "/openapi.json",                # FastAPI's default OpenAPI schema
    "/health",                      # Health check endpoint defined in main.py at root
    "/",                            # Root health check
    "/api/v1/auth/login",           # Login route is public; tenant context from X-Tenant-ID
    "/api/v1/auth/enhanced-login",  # Enhanced login route that doesn't require tenant ID
    # "/api/v1/tenants/me",         # REMOVED: Tenant data now included in login response
    # Add other public API prefixes under /api/v1 as needed:
    # e.g., "/api/v1/tenants" (if Tenant CRUD is public/admin)
    # e.g., "/api/v1/adminmaster/"
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

        # If not a public route, it's a tenant-specific route. JWT token is required.
        authorization = request.headers.get("Authorization")

        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                content={"detail": "Authorization header with Bearer token is required for this route."},
                status_code=401
            )

        token = authorization.split(" ")[1]  # Extract token after "Bearer "
        
        try:
            payload = decode_access_token(token)
            if not payload:
                return JSONResponse(
                    content={"detail": "Invalid or expired token."},
                    status_code=401
                )
            
            tenant_uuid = UUID(payload.tenant_id)
            tenant_schema = payload.tenant_schema
            
        except Exception as e:
            return JSONResponse(
                content={"detail": "Invalid token format or content."},
                status_code=401
            )

        # Schema name is now directly available from JWT token - no database lookup needed!

        # Store tenant info in request state for get_db and other dependencies to use
        request.state.tenant_id = tenant_uuid
        request.state.tenant_schema_name = tenant_schema
        request.state.use_public_schema = False # Explicitly false for tenant routes

        # The actual schema switching (e.g., "USE tenant_xyz;") will be handled in get_db
        # based on request.state.tenant_schema_name.

        response = await call_next(request)
        return response
