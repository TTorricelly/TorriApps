# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TorriApps is a multi-tenant salon/barbershop management SaaS platform with white-label mobile client applications. The system serves multiple beauty businesses through schema-based database multi-tenancy and provides branded mobile apps for their customers.

## Architecture

### Multi-Tenant Database Strategy
- **Schema-based multi-tenancy**: Each tenant gets its own MySQL schema
- **Public schema**: Stores tenant metadata and admin users in `public.tenants` and `public.admin_master_users` tables
- **Tenant schemas**: Store business-specific data (users, appointments, services, etc.)
- **TenantMiddleware**: Handles schema switching based on `X-Tenant-ID` header

### Component Structure
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL with multi-tenant architecture
- **Web-admin**: React.js administrative interface for salon owners
- **Mobile-client-core**: React Native base application with white-label capabilities
- **Mobile-client-configs**: Brand-specific configurations and assets for white-label apps
- **Infrastructure**: Docker, Kubernetes, Terraform deployment automation

## Development Commands

### Backend Development
```bash
# Navigate to backend directory
cd torri-apps/Backend

# Install dependencies
pip install -r Requirements.txt

# Run development server
PYTHONPATH=. uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
python3 -m pytest Tests/

# Database migrations
alembic revision --autogenerate -m "Migration message"
alembic upgrade head
```

### Testing
- **Framework**: pytest with SQLAlchemy fixtures
- **Test Database**: SQLite in-memory for speed
- **Multi-tenant Testing**: Uses `conftest.py` with tenant and user fixtures
- **Test Structure**: Separate test modules per feature in `Tests/` directory

### Environment Configuration
Required `.env` file in Backend directory:
```
DATABASE_URL=mysql+mysqlconnector://root:@localhost:3306/torri_app_public
SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
DEBUG=true
```

## Key Design Patterns

### Multi-Tenant Request Flow
1. **TenantMiddleware** intercepts requests and checks for `X-Tenant-ID` header
2. **Public routes** (auth, docs, health) bypass tenant validation
3. **Tenant routes** require valid tenant ID and set `request.state.tenant_schema_name`
4. **Database dependencies** use request state to switch MySQL schemas

### Module Structure
Each business module follows this pattern:
```
Modules/FeatureName/
├── __init__.py
├── models.py      # SQLAlchemy models
├── schemas.py     # Pydantic models for API
├── routes.py      # FastAPI route handlers
├── services.py    # Business logic layer
└── constants.py   # Module-specific constants
```

### Authentication & Authorization
- **JWT tokens** with tenant-specific user roles (GESTOR, PROFESSIONAL, CLIENT)
- **Multi-tenant users**: Users belong to specific tenants via `tenant_id` foreign key
- **Role-based access**: Different API permissions based on user roles

## Mobile White-Label System

### Brand Configuration
- **Shared core**: Common React Native codebase in `Mobile-client-core/`
- **Brand configs**: Individual brand settings in `Mobile-client-configs/Brands/`
- **Build automation**: Scripts generate brand-specific apps with custom themes, assets, and store configurations

### Build Process
```bash
# Build all brand apps
cd Mobile-client-configs/Scripts
node Build-all-apps.js

# Build specific brand
node Build-app.js --brand=beauty-hub
```

## Database Schema Management

### Alembic Multi-Tenant Setup
- **Base metadata**: `Base` for tenant schemas, `BasePublic` for public schema
- **Schema detection**: Models automatically detect target schema via `__table_args__`
- **Migration strategy**: Separate migrations for public vs tenant schemas

### Key Models
- **Public Schema**: `Tenant`, `AdminMasterUser` 
- **Tenant Schema**: `UserTenant`, `Service`, `Appointment`, `Availability`

## API Structure

### Route Organization
- **Global prefix**: `/api/v1` for all API endpoints
- **Module routing**: Each module registers its own router with appropriate tags
- **Public routes**: Authentication and health checks
- **Tenant routes**: Require `X-Tenant-ID` header for all business operations

### Request Headers
- **X-Tenant-ID**: Required UUID for all tenant-specific operations
- **Authorization**: Bearer JWT token for authenticated endpoints

## Deployment

### Infrastructure
- **Docker**: Containerized applications with multi-stage builds
- **Kubernetes**: Production orchestration with tenant isolation
- **Terraform**: Infrastructure as code for cloud resources

### Mobile Deployment
- **Fastlane**: Automated iOS and Android app store deployments
- **Multi-brand**: Batch deployment system for all white-label apps
- **Store management**: Separate App Store Connect and Google Play Console configurations per brand