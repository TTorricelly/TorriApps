# CLAUDE.md

This file provides guidance to AIs to code when working with code in this repository.

## Project Overview

TorriApps is a salon/barbershop management SaaS platform with white-label mobile client applications. The system provides comprehensive business management tools for beauty professionals and branded mobile apps for their customers.

## Architecture

**Current Architecture (Single Schema):**
- **Single Database**: `my_hair_salon` - Contains all application data
- **Data Model**: Entities (users, appointments, services, categories)
- **Simplified Authentication**: JWT-based auth

### Component Structure
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL with single schema architecture
- **Web-admin**: React.js administrative interface for salon owners
- **Mobile-client-core**: React Native base application with white-label capabilities
- **Mobile-client-configs**: Brand-specific configurations and assets for white-label apps
- **Infrastructure**: TBD

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
- **Test Structure**: Separate test modules per feature in `Tests/` directory

### Environment Configuration
Required `.env` file in Backend directory:
```
DATABASE_URL=postgresql://username:password@host:port/database
DEFAULT_SCHEMA_NAME=public
SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
DEBUG=true
```

**Note**: The project has been migrated from MySQL to PostgreSQL. UUID fields are handled natively by PostgreSQL with `UUID(as_uuid=True)` column types.

## Key Design Patterns

### Single Schema Request Flow
⚠️ **CURRENT ARCHITECTURE**

1. **Simplified Middleware** handles basic JWT authentication
2. **All routes** use the same `my_hair_salon` database
3. **JWT tokens** contain user info 
6. **Authorization header only** - `Bearer <jwt_token>`

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

## Database Schema Management

### Alembic Single Schema Setup
- **Base metadata**: Unified `Base` for all models in single schema
- **Simplified migrations**: All models use same database schema
- **Migration strategy**: Single migration path for all tables

### Key Models
- **Single Schema** (`my_hair_salon`): All models in unified database
  - `User` - User accounts and authentication
  - `Category` - Service categories
  - `Service` - Service offerings
  - `Appointment` - Booking data
  - `Availability` - Schedule management

## API Structure

### Route Organization
- **Global prefix**: `/api/v1` for all API endpoints
- **Module routing**: Each module registers its own router with appropriate tags
- **Simplified routes**: All routes use single database schema
- **Authentication routes**: `/api/v1/auth/login`

### Request Headers (Current Implementation)
- **Authorization**: Bearer JWT token for authenticated endpoints

