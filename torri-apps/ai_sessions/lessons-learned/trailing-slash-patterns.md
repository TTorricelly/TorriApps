# Trailing Slash Patterns - Multi-tenant System

## 🚨 **Critical Rule: NO TRAILING SLASHES ANYWHERE**

### Backend Pattern (FastAPI)
```python
# ✅ CORRECT - Collection endpoints
@router.get("")  # NOT "/"
@router.post("") # NOT "/"

# ✅ CORRECT - Item endpoints  
@router.get("/{item_id}")
@router.put("/{item_id}")
```

### Frontend Pattern (React)
```javascript
// ✅ CORRECT - API calls
buildApiEndpoint('users')        // NOT 'users/'
buildApiEndpoint('appointments') // NOT 'appointments/'

// ✅ CORRECT - Navigation
navigate(`/${tenantSlug}/dashboard`) // Include tenant slug
```

## Why This Pattern?

**FastAPI Behavior**: 
- Route `@router.get("/")` + call `/api/v1/users/` = **307 redirect** to `/api/v1/users`
- **307 redirects break CORS preflight** and cause failed requests

**Solution**: 
- Backend: Use `""` for collection endpoints
- Frontend: Use clean endpoint names without trailing slashes

## URL Builders

### buildApiEndpoint Function
```javascript
// Already handles correctly:
buildApiEndpoint('users') → 'api/v1/tenant-slug/users'
// Removes leading slashes, never adds trailing slashes
```

### Navigation Pattern
```javascript
// ✅ ALWAYS include tenant slug
const { tenantSlug } = useParams()
navigate(`/${tenantSlug}/target-path`)

// ❌ NEVER hardcode paths
navigate('/dashboard') // Will lose tenant context
```

## Affected Modules

### Backend
- ✅ Users: `""` for collections
- ✅ Appointments: `""` for collections  
- ✅ Professionals: `""` for collections
- ✅ Services: `""` for collections
- ✅ Commissions: `""` for collections

### Frontend
- ✅ App-client: All API calls use clean endpoints
- ✅ Web-admin: Fixed trailing slash issues
- ✅ All navigation includes tenant slug

## Quick Debug

**Seeing 307 redirects?** → Check for trailing slash mismatches
**Users losing tenant context?** → Check for hardcoded navigation paths

## Pattern Enforcement

1. **Backend**: All collection routes use `@router.get("")`
2. **Frontend**: All API calls use `buildApiEndpoint('clean-name')`
3. **Navigation**: Always use `navigate(\`/${tenantSlug}/path\`)`