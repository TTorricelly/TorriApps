# TorriApps Development Guide

## Project Overview
Multi-tenant salon management system with React frontend, FastAPI backend, and PostgreSQL database supporting both domain-based and slug-based tenant routing.

## Architecture Patterns

### 1. Multi-Tenant Architecture
- **Database**: Schema-per-tenant isolation (`tenant_{slug}` schemas)
- **Routing**: Supports domain-based (`tenant1.com.br`) and slug-based (`vervio.com.br/tenant-slug`)
- **Middleware**: Automatic tenant detection and schema switching
- **API**: Clean routes without tenant parameters in handlers

### 2. Navigation System
**Always use centralized navigation patterns:**
- Import: `import { useNavigation } from '../shared/hooks/useNavigation'`
- Import: `import { ROUTES } from '../shared/navigation'`
- Usage: `const { navigate } = useNavigation(); navigate(ROUTES.DASHBOARD)`
- **Never hardcode tenant slugs in navigation**

### 3. API Patterns
**Backend Routes (FastAPI):**
- Register clean routes: `app.include_router(users_router, prefix="/api/v1/users")`
- Route handlers have NO `tenant_slug` parameter
- Use `get_db()` dependency for automatic schema switching

**Frontend API Calls:**
- Use `buildApiEndpoint('users')` for tenant-aware URLs
- Add `{ isPublic: true }` for public endpoints (auth, service images)

### 4. Code Organization

#### Backend Structure
```
Backend/
├── Core/                    # Framework core
│   ├── Auth/               # Authentication system
│   ├── Database/           # DB connections & dependencies
│   ├── Middleware/         # Tenant middleware
│   └── Utils/             # Shared utilities
└── Modules/               # Business domains
    ├── Users/routes.py    # Clean route definitions
    ├── Services/          # Service management
    └── Appointments/      # Booking system
```

#### Frontend Structure
```
Web-admin/Src/
├── Pages/                 # Page components
├── Services/             # API service layer
├── Components/           # Reusable components
└── shared/               # Navigation system
    ├── navigation/index.js   # Route constants
    └── hooks/useNavigation.js # Navigation utilities

App-client/src/
├── pages/                # Page components  
├── services/            # API service layer
├── components/          # Reusable components
└── shared/              # Navigation system
```

## Development Rules

### 1. Navigation
- **ALWAYS** use `useNavigation()` hook and `ROUTES` constants
- **NEVER** hardcode `/${tenantSlug}/path` in components
- **NEVER** extract `tenantSlug` from `useParams()` for navigation

### 2. API Integration
- Backend: Use `get_db()` dependency for tenant-aware database sessions
- Frontend: Use `buildApiEndpoint()` for tenant-aware API URLs
- Routes are clean without tenant parameters

### 3. FastAPI Routing
- Register routes WITHOUT `{tenant_slug}` parameters
- Use empty string `""` or `"/"` for collection endpoints (avoid 307 redirects)
- Remove module-level prefixes that duplicate main.py routing

### 4. Database Patterns
- Each tenant gets isolated schema: `tenant_{slug}`
- Use closure table pattern for hierarchical data (accounts, categories)
- Always use UUID primary keys for tenant-scoped entities

## Essential Patterns Reference

### Navigation Hook Usage
```javascript
// ✅ Correct
const { navigate } = useNavigation();
navigate(ROUTES.SERVICES.EDIT(serviceId));

// ❌ Wrong
const { tenantSlug } = useParams();
navigate(`/${tenantSlug}/services/edit/${serviceId}`);
```

### API Service Pattern
```javascript
// ✅ Correct
const endpoint = buildApiEndpoint('services');
const response = await api.get(endpoint);

// ❌ Wrong  
const apiUrl = `/api/v1/${tenantSlug}/services`;
```

### FastAPI Route Pattern
```python
# ✅ Correct
@router.get("/", response_model=List[UserSchema])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

# ❌ Wrong
@router.get("/{tenant_slug}/", response_model=List[UserSchema])  
def list_users(tenant_slug: str, db: Session = Depends(get_db)):
```

## Key Files to Reference

### Navigation System
- `torri-apps/ai_sessions/lessons-learned/centralized-navigation-architecture.md`
- `torri-apps/ai_sessions/lessons-learned/navigation-implementation-summary.md`

### Multi-Tenant Implementation  
- `torri-apps/ai_sessions/lessons-learned/domain-based-multi-tenant-implementation-guide.md`
- `torri-apps/ai_sessions/multi-tenant/centralized-navigation-architecture-migration.md`

### API Patterns
- `torri-apps/ai_sessions/multi-tenant/session-backend-api-routing-fixes.md`
- `torri-apps/ai_sessions/lessons-learned/trailing-slash-patterns.md`

## Commands

### Backend
- Start: `cd Backend && python main.py`
- Migrate: `cd Backend && alembic upgrade head`
- Test: `cd Backend && pytest`

### Frontend
- Web-admin: `cd Web-admin && npm run dev`
- App-client: `cd App-client && npm run dev`
- Build: `npm run build`

## Migration Patterns
When migrating components to new patterns:
1. Replace hardcoded navigation with `useNavigation()` hook
2. Update API calls to use `buildApiEndpoint()`
3. Remove tenant slug extraction from `useParams()` when only used for navigation
4. Follow established route constant naming conventions