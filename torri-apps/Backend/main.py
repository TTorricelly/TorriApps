from fastapi import FastAPI
# Using relative imports assuming main.py is in torri-apps/Backend/
from .Core.Middleware.TenantMiddleware import TenantMiddleware
from .Core.Auth.Routes import router as auth_router
from .Modules.Users.routes import router as users_router
from .Modules.Services.routes import categories_router, services_router
from .Modules.Availability.routes import router as availability_router # Import new availability router
# Placeholder for other routers:
# from .Modules.Tenants.routes import router as tenants_router
# from .Modules.AdminMaster.routes import router as admin_master_router

app = FastAPI(
    title="Torri Apps Multi-Tenant Backend",
    version="0.1.0",
    description="Backend para o sistema de agendamento de salões/barbearias multi-tenant.",
    # You can customize OpenAPI paths if needed, e.g.:
    # openapi_url="/api/v1/openapi.json",
    # docs_url="/api/v1/docs",
    # redoc_url="/api/v1/redoc",
)

# --- Middleware Registration ---
# TenantMiddleware must be registered early to process requests for tenant context.
app.add_middleware(TenantMiddleware)

# --- API Routers ---
# The routers are defined with their own prefixes (e.g., /auth, /users).
# If a global prefix like /api/v1 is desired for all of them,
# it can be added here or by using a parent APIRouter.

# Example: Adding a global /api/v1 prefix to each router
# This makes routes like /api/v1/auth/... and /api/v1/users/...
API_V1_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_V1_PREFIX, tags=["Authentication"])
app.include_router(users_router, prefix=API_V1_PREFIX, tags=["Users Management (Tenant)"])
app.include_router(categories_router, prefix=f"{API_V1_PREFIX}/categories", tags=["Service Categories (Tenant)"])
app.include_router(services_router, prefix=f"{API_V1_PREFIX}/services", tags=["Services (Tenant)"])
app.include_router(availability_router, prefix=f"{API_V1_PREFIX}/availability", tags=["Professional Availability (Tenant)"])
# app.include_router(tenants_router, prefix=API_V1_PREFIX, tags=["Tenants (Public Admin)"]) # When ready
# app.include_router(admin_master_router, prefix=API_V1_PREFIX, tags=["Admin Master Users (Public Admin)"]) # When ready


# --- Root Health Check ---
# A simple health check endpoint for the root path or a specific health path.
@app.get("/", tags=["Health Check"])
async def root_health_check():
    return {"message": "Torri Apps Backend is running!"}

@app.get("/health", tags=["Health Check"]) # Another common health check path
async def health_check_explicit():
    return {"status": "healthy", "message": "Torri Apps Backend is operational."}

# To run this application (from the directory containing `torri-apps`):
# PYTHONPATH=. uvicorn torri_apps.Backend.main:app --reload --host 0.0.0.0 --port 8000
#
# Note on PUBLIC_ROUTE_PREFIXES in TenantMiddleware:
# The paths for docs (/docs, /openapi.json) are typically handled by FastAPI itself
# before custom middleware if not careful.
# If TenantMiddleware's PUBLIC_ROUTE_PREFIXES includes /docs and /openapi.json,
# and these are served by FastAPI at the root, ensure this logic is compatible.
# The current TenantMiddleware checks `request.url.path.startswith(prefix)`.
# FastAPI's default docs are at /docs and /openapi.json.
# If `API_V1_PREFIX` is used for actual API routes, then /docs and /openapi.json
# at the root are naturally public and distinct from API routes.
# The TenantMiddleware's PUBLIC_ROUTE_PREFIXES should reflect the actual paths
# that are considered public and bypass tenant logic.
# If docs are exposed under API_V1_PREFIX (e.g. /api/v1/docs), then these paths
# should be added to PUBLIC_ROUTE_PREFIXES in TenantMiddleware.py.
# For now, assuming /docs, /openapi.json are at root and are fine.
# The /auth/login route is now /api/v1/auth/login, so PUBLIC_ROUTE_PREFIXES
# in TenantMiddleware should be updated to "/api/v1/auth/login".
# Similarly for a future /api/v1/tenants (if public).
# This adjustment is crucial for TenantMiddleware to correctly identify public routes.
# This will be handled in the next step by updating TenantMiddleware.py.
