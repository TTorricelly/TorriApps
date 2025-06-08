from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORS middleware
from fastapi.staticfiles import StaticFiles

# Using absolute imports for main.py
from Core.Auth.Routes import router as auth_router
from Modules.Users.routes import router as users_router
from Modules.Services.routes import categories_router, services_router
from Modules.Availability.routes import router as availability_router
from Modules.Appointments.routes import router as appointments_router
from Modules.Professionals.routes import router as professionals_router
import Modules.Professionals  # Import module to register models
from Core.Utils.exception_handlers import add_exception_handlers # Import the function
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
# TODO: Move origins to settings.py or .env for production/staging environments
origins = [
    "http://localhost",       # Common for local development
    "http://localhost:3000",  # React default
    "http://localhost:5173",  # Vite default port
    "http://localhost:8080",  # Vue default
    "http://localhost:8081",  # Often used for Vue/Angular
    "http://localhost:4200",  # Angular default
    # Add any other frontend origins used for development or deployed environments
    # e.g., "https://your-frontend-domain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allow cookies and authorization headers
    allow_methods=["*"],    # Allow all common HTTP methods
    allow_headers=["*"],    # Allow all headers
)

# --- Custom Middlewares Registration ---
# TenantMiddleware must be registered early, but typically after CORS.
# app.add_middleware(TenantMiddleware) # TenantMiddleware removed

# --- Exception Handlers ---
# Add custom exception handlers to the app.
add_exception_handlers(app)

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
app.include_router(appointments_router, prefix=f"{API_V1_PREFIX}/appointments", tags=["Appointments (Tenant)"])
app.include_router(professionals_router, prefix=API_V1_PREFIX, tags=["Professionals Management"])
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
