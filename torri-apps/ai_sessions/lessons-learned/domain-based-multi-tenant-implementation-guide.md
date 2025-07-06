# Domain-Based Multi-Tenant Architecture Implementation Guide

## Overview
This guide details the implementation of a multi-tenant system that supports both domain-based (`tenant1.com.br`) and slug-based (`vervio.com.br/tenant-slug`) tenant identification with automatic schema switching.

## Architecture Flow

```
Browser URL → Frontend → API Request → Middleware → Route Handler → Database
                                           ↓
                                    Tenant Detection
                                           ↓
                                    Schema Switching
```

## 1. Database Structure

### Public Schema
```sql
-- public.tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(50) UNIQUE,
    custom_domain VARCHAR(255) UNIQUE,
    db_schema_name VARCHAR(63) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Tenant Schemas
```sql
-- Each tenant has isolated schema: tenant_{slug}
-- Example: tenant_salon_example
CREATE SCHEMA tenant_salon_example;

-- All tenant data lives in their schema
CREATE TABLE tenant_salon_example.users (...);
CREATE TABLE tenant_salon_example.appointments (...);
CREATE TABLE tenant_salon_example.services (...);
```

## 2. Backend Implementation

### 2.1 Middleware (`Core/Middleware/tenant.py`)

**Purpose:** Extract tenant from request, set database context, rewrite paths

```python
class TenantMiddleware:
    async def dispatch(self, request: Request, call_next):
        # 1. Extract tenant info
        tenant_info = self._extract_tenant_info(request)
        
        # 2. Validate tenant and set context
        if tenant_info:
            tenant = get_tenant_by_slug_or_domain(...)
            TenantContext.set_tenant(tenant)
            
            # 3. Rewrite path for slug-based tenants
            if tenant_info['method'] == 'slug':
                # /api/v1/tenant-slug/users → /api/v1/users
                self._rewrite_request_path(request, tenant_info['slug'])
        
        # 4. Continue to route handler
        return await call_next(request)
    
    def _extract_tenant_info(self, request):
        # Priority 1: Check domain
        host = request.headers.get('host', '').lower()
        domain = host.split(':')[0]  # Remove port
        
        # Check if NOT main domain
        if domain and domain != 'vervio.com.br' and not domain.startswith('localhost'):
            return {'method': 'domain', 'domain': domain}
        
        # Priority 2: Check URL slug  
        match = re.match(r'^/api/v1/([a-z0-9_-]+)/', request.url.path)
        if match:
            return {'method': 'slug', 'slug': match.group(1)}
    
    def _rewrite_request_path(self, request, tenant_slug):
        """Remove tenant slug from path for clean route matching."""
        original_path = request.scope['path']
        # Replace /api/v1/{tenant_slug}/... with /api/v1/...
        new_path = original_path.replace(f'/api/v1/{tenant_slug}/', '/api/v1/', 1)
        request.scope['path'] = new_path
```

### 2.2 Database Dependencies (`Core/Database/dependencies.py`)

**Purpose:** Provide database sessions with correct tenant schema

**Current Implementation (Already Working):**
```python
def get_db():
    """Get database session - automatically uses tenant schema if context exists."""
    schema_name = get_current_schema_name()  # From TenantContext
    
    if schema_name:
        # Return session for tenant schema
        db_gen = get_tenant_db(schema_name)
        db = next(db_gen)
        try:
            yield db
        finally:
            db.close()
    else:
        # Return session for public schema
        db_gen = get_public_db()
        db = next(db_gen)
        try:
            yield db
        finally:
            db.close()
```

**Note:** The existing `get_db()` already handles schema switching based on tenant context set by middleware.

### 2.3 Route Registration (`main.py`)

**Purpose:** Register clean routes without tenant slug

```python
# API prefix
API_V1_PREFIX = "/api/v1"

# Public routes (no tenant context)
app.include_router(tenants_router, prefix=API_V1_PREFIX)

# Tenant routes (clean paths - no {tenant_slug})
app.include_router(auth_router, prefix=f"{API_V1_PREFIX}/auth")
app.include_router(users_router, prefix=f"{API_V1_PREFIX}/users")
app.include_router(appointments_router, prefix=f"{API_V1_PREFIX}/appointments")
app.include_router(services_router, prefix=f"{API_V1_PREFIX}/services")
# ... other routers
```

**Key point:** Routes are registered WITHOUT `{tenant_slug}` parameter. The middleware handles:
- **Domain tenants:** Direct routing to clean paths
- **Slug tenants:** Path rewriting removes slug before route matching

### 2.4 Route Handlers (e.g., `Modules/Users/routes.py`)

**Purpose:** Handle business logic without tenant awareness

```python
@router.get("", response_model=List[UserSchema])  # NO trailing slash!
def list_users(
    db: Session = Depends(get_db),  # Session already uses tenant schema
    role: Optional[UserRole] = Query(None),
    limit: int = Query(100)
):
    # No tenant_slug parameter needed!
    # Direct query - automatically uses tenant schema from context
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.limit(limit).all()

@router.get("/{user_id}")
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    # No tenant handling needed - db session handles it
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    return user
```

**Key point:** Route handlers have NO `tenant_slug` parameter. They are completely tenant-agnostic.

## 3. Frontend Implementation

### 3.1 Tenant Detection (`utils/apiHelpers.js`)

**Purpose:** Detect tenant method and build appropriate API URLs

```javascript
export const getTenantInfo = () => {
  const hostname = window.location.hostname;
  const path = window.location.pathname;
  
  // Domain-based tenant
  if (hostname !== 'vervio.com.br' && !hostname.startsWith('localhost')) {
    return {
      method: 'domain',
      domain: hostname,
      slug: null
    };
  }
  
  // Slug-based tenant (first path segment)
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    return {
      method: 'slug',
      domain: null,
      slug: segments[0]
    };
  }
  
  return null;
};

export const buildApiEndpoint = (endpoint, version = 'v1', options = {}) => {
  const { isPublic = false } = options;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (isPublic) {
    return `/api/${version}/${cleanEndpoint}`;
  }
  
  const tenantInfo = getTenantInfo();
  
  if (tenantInfo?.method === 'domain') {
    // Domain tenant: clean URL
    return `/api/${version}/${cleanEndpoint}`;
  } else if (tenantInfo?.method === 'slug') {
    // Slug tenant: include slug in URL
    return `/api/${version}/${tenantInfo.slug}/${cleanEndpoint}`;
  }
  
  throw new Error('Tenant context required');
};
```

### 3.2 Navigation Components

**Purpose:** Build correct frontend routes based on tenant type

```javascript
const Navigation = () => {
  const tenantInfo = getTenantInfo();
  
  const buildRoute = (path) => {
    if (tenantInfo?.method === 'slug') {
      return `/${tenantInfo.slug}${path}`;
    }
    return path;
  };
  
  return (
    <nav>
      <Link to={buildRoute('/dashboard')}>Dashboard</Link>
      <Link to={buildRoute('/users')}>Users</Link>
      <Link to={buildRoute('/appointments')}>Appointments</Link>
    </nav>
  );
};
```

### 3.3 Service Files

**Purpose:** Make API calls using buildApiEndpoint

```javascript
// services/userService.js
export const getUsers = async (params) => {
  const endpoint = buildApiEndpoint('users');
  const response = await api.get(endpoint, { params });
  return response.data;
};

export const getUser = async (userId) => {
  const endpoint = buildApiEndpoint(`users/${userId}`);
  const response = await api.get(endpoint);
  return response.data;
};
```

## 4. Request Flow Examples

### Domain-Based Tenant
```
1. Browser: tenant1.com.br/users
2. Frontend: GET tenant1.com.br/api/v1/users
3. Middleware: 
   - Extract domain: tenant1.com.br
   - Query: SELECT * FROM public.tenants WHERE custom_domain = 'tenant1.com.br'
   - Set context: schema = 'tenant_tenant1'
4. Route: /api/v1/users matches
5. get_db(): SET search_path TO tenant_tenant1
6. Query: SELECT * FROM users (uses tenant_tenant1.users)
```

### Slug-Based Tenant
```
1. Browser: vervio.com.br/tenant-slug/users
2. Frontend: GET vervio.com.br/api/v1/tenant-slug/users
3. Middleware:
   - Extract slug: tenant-slug
   - Query: SELECT * FROM public.tenants WHERE slug = 'tenant-slug'
   - Set context: schema = 'tenant_tenant_slug'
   - Rewrite path: /api/v1/tenant-slug/users → /api/v1/users
4. Route: /api/v1/users matches
5. get_db(): SET search_path TO tenant_tenant_slug
6. Query: SELECT * FROM users (uses tenant_tenant_slug.users)
```

## 5. Key Principles

1. **Single Route Definition:** Each endpoint defined once, works for all tenants
2. **Middleware Handles Complexity:** All tenant detection/validation in one place
3. **Transparent Schema Switching:** Routes don't know about tenants
4. **Clean URLs:** Domain tenants get clean URLs without slugs
5. **Backward Compatible:** Slug-based tenants continue working

## 6. Implementation Checklist

### Backend - Phase 1 (Database)
- [ ] Add `custom_domain` field to tenants table
- [ ] Update tenant model and schemas
- [ ] Create migration for database changes

### Backend - Phase 2 (Middleware)
- [ ] Update TenantMiddleware with domain detection
- [ ] Add path rewriting logic for slug tenants
- [ ] Update tenant services to support domain lookup
- [ ] Ensure middleware validates tenant and sets context

### Backend - Phase 3 (Routes)
- [ ] Update main.py to register clean routes (no {tenant_slug})
- [ ] Remove `tenant_slug` parameter from ALL route handlers
- [ ] Ensure all route handlers use db session from get_db()
- [ ] Test that queries automatically use tenant schema

### Frontend
- [ ] Implement getTenantInfo() in apiHelpers (both Web-admin and App-client)
- [ ] Update buildApiEndpoint() for both tenant types
- [ ] Update all navigation components
- [ ] Remove hardcoded tenant slug from components

### Testing
- [ ] Test domain-based tenant: `tenant1.com.br/api/v1/users`
- [ ] Test slug-based tenant: `vervio.com.br/api/v1/tenant-slug/users`
- [ ] Verify middleware path rewriting works
- [ ] Confirm database queries use correct schema
- [ ] Test frontend navigation for both types

## 7. Common Pitfalls to Avoid

1. **Don't duplicate routes** - One route definition serves all tenants
2. **Don't handle tenants in routes** - Middleware does this
3. **Don't forget path rewriting** - Slug tenants need paths rewritten
4. **Don't hardcode tenant detection** - Use consistent helper functions
5. **Don't mix concerns** - Keep tenant logic in middleware only

## 8. Benefits of This Architecture

- **Clean Code:** Routes focus on business logic only
- **Scalability:** Easy to add new tenants
- **Flexibility:** Supports both domain and slug access
- **Security:** Complete schema isolation
- **Maintainability:** Tenant logic in one place
- **User Experience:** Clean URLs for custom domains