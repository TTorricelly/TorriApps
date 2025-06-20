# TorriApps Development Best Practices

## API Service Layer Best Practices

### Environment-Aware URL Management

All API service files should follow consistent patterns for URL construction and error handling to ensure they work across different environments (development, staging, production, Codespaces).

#### Required Imports
```javascript
import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint, createCrudApi } from '../Utils/apiHelpers';
```

#### URL Construction
- **Always use `buildApiEndpoint()`** instead of hardcoded paths
- This ensures consistent `/api/v1/` prefixing and environment compatibility

```javascript
// ✅ Good - Environment aware
const endpoint = buildApiEndpoint('stations/types');

// ❌ Bad - Hardcoded path
const response = await api.get('/stations/types');
```

#### Error Handling
- **Always wrap API calls** with `withApiErrorHandling()`
- Provide appropriate default values for failed requests
- Transform data consistently

```javascript
// ✅ Good - Robust error handling
return withApiErrorHandling(
  () => api.get(endpoint),
  {
    defaultValue: [],
    transformData: (data) => Array.isArray(data) ? data : []
  }
);

// ❌ Bad - No error handling
const response = await api.get(endpoint);
return response.data;
```

#### CRUD Operations
- **Use `createCrudApi()` factory** for standard CRUD operations
- Override specific methods only when custom logic is needed

```javascript
// ✅ Good - Leverage factory pattern
const baseCrudApi = createCrudApi({
  endpoint: 'stations/types',
  entityName: 'station types'
});

export const stationTypesApi = {
  ...baseCrudApi,
  
  // Override only when custom logic needed
  getAll: async () => {
    // Custom implementation
  }
};
```

#### Image Handling
- For entities with images, specify `imageFields` in the CRUD factory
- This ensures consistent URL processing across environments

```javascript
const SERVICE_IMAGE_FIELDS = [
  'image_url', 
  'liso_image_url', 
  'ondulado_image_url', 
  'cacheado_image_url', 
  'crespo_image_url'
];

const baseCrudApi = createCrudApi({
  endpoint: 'services',
  imageFields: SERVICE_IMAGE_FIELDS,
  entityName: 'services'
});
```

### Configuration Management

#### Environment Variables
- Use `VITE_API_BASE_URL` for API base URL configuration
- Support automatic Codespaces URL detection
- Provide sensible defaults for development

#### Base URL Configuration
The `api/client.js` should use:
```javascript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});
```

### File Organization

#### Service Files Structure
```
src/Services/
├── stations.js          # Station-related APIs
├── services.js          # Service catalog APIs  
├── professionals.js     # Professional management APIs
└── ...
```

#### Utility Files
```
src/Utils/
├── apiHelpers.js        # API wrapper utilities
├── config.js           # Environment configuration
└── urlHelpers.js       # URL processing utilities
```

### Implementation Checklist

When creating or updating API service files:

- [ ] Import required utilities (`withApiErrorHandling`, `buildApiEndpoint`, `createCrudApi`)
- [ ] Use `createCrudApi()` factory for standard CRUD operations
- [ ] Use `buildApiEndpoint()` for all URL construction
- [ ] Wrap all API calls with `withApiErrorHandling()`
- [ ] Provide appropriate default values (empty arrays for lists, null for objects)
- [ ] Specify image fields if the entity has images
- [ ] Test across different environments (local, Codespaces, production)

### Example Implementation

```javascript
import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint, createCrudApi } from '../Utils/apiHelpers';

// Create base CRUD operations
const entityCrudApi = createCrudApi({
  endpoint: 'entity-path',
  imageFields: ['image_url'], // if applicable
  entityName: 'entities'
});

export const entityApi = {
  ...entityCrudApi,
  
  // Override methods only when custom logic is needed
  getAll: async (filters = {}) => {
    const params = {}; // build params from filters
    const endpoint = buildApiEndpoint('entity-path');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  }
};
```

This pattern ensures:
- 🌍 Environment compatibility (dev, staging, prod, Codespaces)
- 🛡️ Robust error handling with fallbacks
- 🔄 Consistent API versioning
- 🖼️ Proper image URL processing
- 🏭 Reusable CRUD operations
- 📝 Type-safe data transformations

## Database Migration from MySQL to PostgreSQL

### Key Changes Made
The project has been migrated from MySQL to PostgreSQL. Key differences to be aware of:

#### UUID Handling
- **PostgreSQL**: Uses `UUID(as_uuid=True)` columns that expect UUID objects
- **MySQL**: Used `CHAR(36)` columns that expected string representations

```python
# ✅ PostgreSQL - UUID objects
stmt = select(Service).where(Service.id == service_id)

# ❌ MySQL legacy - string conversion
stmt = select(Service).where(Service.id == str(service_id))
```

#### Connection Configuration
- **Database URL**: Now uses `postgresql://` instead of `mysql+mysqlconnector://`
- **Dependencies**: Uses `psycopg2-binary` instead of `mysql-connector-python`
- **SSL Settings**: PostgreSQL connections (especially Supabase) require SSL configuration

#### Migration Files
- Existing migration files may still reference MySQL dialects
- New migrations should use PostgreSQL-specific features when needed
- Old migrations are preserved for historical reference but target PostgreSQL

### Important Notes
- Always use UUID objects for database queries, not string conversions
- PostgreSQL handles case sensitivity differently than MySQL
- Schema validation is stricter in PostgreSQL