from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORS middleware
from fastapi.staticfiles import StaticFiles

# Import settings configuration
from Config.Settings import settings

# Using absolute imports for main.py
from Core.Auth.Routes import router as auth_router
from Modules.Tenants.routes import router as tenants_router
from Modules.Users.routes import router as users_router
from Modules.Services.routes import categories_router, services_router
from Modules.Services.image_routes import router as service_images_router
from Modules.Availability.routes import router as availability_router
from Modules.Appointments.routes import router as appointments_router
from Modules.Professionals.routes import router as professionals_router
from Modules.Stations.routes import router as stations_router
from Modules.Settings.routes import router as settings_router
from Modules.Company.routes import router as company_router
from Modules.Commissions.routes import router as commissions_router
from Modules.Labels.routes import router as labels_router
import Modules.Professionals  # Import module to register models
import Modules.Company.models  # Import Company models to register them
import Modules.Payments.models  # Import Payment models to register them
import Modules.Labels.models  # Import Labels models to register them
import Modules.Services.models  # Import Services and ServiceImage models to register them
import Modules.Tenants.models  # Import Tenant models to register them
from Core.Utils.exception_handlers import add_exception_handlers # Import the function
from Config.Relationships import configure_relationships # Import relationship configuration
from Core.Middleware.tenant import TenantMiddleware
# Placeholder for other routers:
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

# --- CORS Middleware ---
# Dynamic CORS origins based on environment configuration
origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allow cookies and authorization headers
    allow_methods=["*"],    # Allow all common HTTP methods
    allow_headers=["*"],    # Allow all headers
)

# --- Custom Middlewares Registration ---
# TenantMiddleware must be registered after CORS middleware
app.add_middleware(TenantMiddleware)

# --- Exception Handlers ---
# Add custom exception handlers to the app.
add_exception_handlers(app)

# --- Relationship Configuration ---
# Configure SQLAlchemy relationships after all models are loaded
configure_relationships()

# --- API Routers ---
# The routers are defined with their own prefixes (e.g., /auth, /users).
# If a global prefix like /api/v1 is desired for all of them,
# it can be added here or by using a parent APIRouter.

# Example: Adding a global /api/v1 prefix to each router
# This makes routes like /api/v1/auth/... and /api/v1/users/...
API_V1_PREFIX = "/api/v1"

# Public routes (no tenant context required)
app.include_router(auth_router, prefix=API_V1_PREFIX, tags=["Authentication"])
app.include_router(tenants_router, prefix=API_V1_PREFIX, tags=["Tenant Management"])

# Tenant routes (require tenant context via {tenant_slug})
app.include_router(categories_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/categories", tags=["Service Categories (Tenant)"])
app.include_router(services_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/services", tags=["Services (Tenant)"])
app.include_router(service_images_router, prefix=API_V1_PREFIX, tags=["Service Images Management"])
app.include_router(availability_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/availability", tags=["Professional Availability (Tenant)"])
app.include_router(appointments_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/appointments", tags=["Appointments (Tenant)"])
app.include_router(professionals_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/professionals", tags=["Professionals Management (Tenant)"])
app.include_router(stations_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/stations", tags=["Stations Management (Tenant)"])
app.include_router(settings_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/settings", tags=["Application Settings (Tenant)"])
app.include_router(company_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/company", tags=["Company Management (Tenant)"])
app.include_router(commissions_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/commissions", tags=["Commissions Management (Tenant)"])
app.include_router(users_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/users", tags=["Users Management (Tenant)"])
app.include_router(labels_router, prefix=f"{API_V1_PREFIX}/{{tenant_slug}}/labels", tags=["Labels Management (Tenant)"])
# app.include_router(admin_master_router, prefix=API_V1_PREFIX, tags=["Admin Master Users (Public Admin)"]) # When ready

# --- Static Files ---
# Serve uploaded files from the public directory
app.mount("/uploads", StaticFiles(directory="public/uploads"), name="uploads")

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
# Note on PUBLIC_ROUTE_PREFIXES in TenantMiddleware (REMOVED):
# Comments related to TenantMiddleware and its PUBLIC_ROUTE_PREFIXES have been removed
# as the middleware itself is no longer in use.
