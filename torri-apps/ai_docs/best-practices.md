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

## Mobile-client-core Specific Implementation

The Mobile-client-core (React Native) follows the same best practices with platform-specific adaptations.

### Required Imports for Mobile-client-core
```javascript
import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import { buildAssetUrl } from '../utils/urlHelpers';
import apiClient from '../config/api';
```

### Environment Configuration for React Native
- Use `REACT_NATIVE_API_BASE_URL` environment variable
- Supports automatic Codespaces URL detection for development
- Falls back to localhost for local development

```javascript
// src/config/environment.js
const developmentConfig = {
  API_BASE_URL: process.env.REACT_NATIVE_API_BASE_URL ||
    (process.env.CODESPACE_NAME 
      ? `https://${process.env.CODESPACE_NAME}-8000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : 'http://localhost:8000'),
  ENVIRONMENT: 'development',
};
```

### Mobile-specific File Organization
```
Mobile-client-core/src/
├── utils/
│   ├── apiHelpers.js        # API wrapper utilities (React Native adapted)
│   └── urlHelpers.js        # URL processing utilities
├── services/
│   ├── authService.js       # Authentication APIs
│   ├── companyService.js    # Company information APIs
│   ├── userService.js       # User profile APIs
│   ├── appointmentService.js # Appointment management APIs
│   ├── categoryService.js   # Service category APIs
│   └── professionalService.js # Professional management APIs
├── config/
│   ├── api.js              # Axios instance configuration
│   └── environment.js      # Environment-specific settings
├── screens/               # Screen components (can use services)
└── components/           # UI components (should NOT use services directly)
```

### Service Implementation Pattern for Mobile-client-core

#### ✅ Standard Service File Structure
```javascript
import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Define image fields for automatic URL processing
const ENTITY_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'image_url'];

/**
 * Get all entities with optional filters
 */
export const getAllEntities = async (filters = {}) => {
  const endpoint = buildApiEndpoint('entities');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params: filters }),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, ENTITY_IMAGE_FIELDS)
    }
  );
};

/**
 * Get entity by ID
 */
export const getEntityById = async (id) => {
  const endpoint = buildApiEndpoint(`entities/${id}`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, ENTITY_IMAGE_FIELDS)
    }
  );
};

/**
 * Create new entity
 */
export const createEntity = async (entityData) => {
  const endpoint = buildApiEndpoint('entities');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, entityData),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, ENTITY_IMAGE_FIELDS)
    }
  );
};
```

### Image URL Processing in Components

#### ✅ Using URL Helpers in React Native Components
```javascript
import React from 'react';
import { Image, View } from 'react-native';
import { buildAssetUrl } from '../utils/urlHelpers';

const MyComponent = ({ imageUrl }) => {
  const fullImageUrl = buildAssetUrl(imageUrl);
  
  return (
    <View>
      {fullImageUrl && (
        <Image source={{ uri: fullImageUrl }} style={{ width: 100, height: 100 }} />
      )}
    </View>
  );
};
```

#### ❌ DON'T: Custom Image URL Processing
```javascript
// ❌ Bad - Don't create custom URL processing functions
const getFullImageUrl = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath.replace('http://localhost:8000', API_BASE_URL);
  }
  return `${API_BASE_URL}${relativePath}`;
};
```

### Image Field Configuration by Entity Type

#### Predefined Image Field Arrays
```javascript
// Company images
const COMPANY_IMAGE_FIELDS = ['logo_url', 'banner_url', 'favicon_url'];

// Professional images  
const PROFESSIONAL_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'profile_picture_url'];

// Service images (includes hair type variants)
const SERVICE_IMAGE_FIELDS = [
  'image_url', 
  'liso_image_url', 
  'ondulado_image_url', 
  'cacheado_image_url', 
  'crespo_image_url'
];

// Category images
const CATEGORY_IMAGE_FIELDS = ['icon_url', 'image_url', 'banner_url'];

// User images
const USER_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'profile_picture_url'];
```

### Mobile-client-core Implementation Checklist

When creating or updating API service files in Mobile-client-core:

- [ ] Import utilities from `../utils/apiHelpers` and `../utils/urlHelpers`
- [ ] Use `buildApiEndpoint()` for all URL construction (never hardcode `/api/v1/`)
- [ ] Wrap ALL API calls with `withApiErrorHandling()`
- [ ] Define appropriate image fields array for the entity type
- [ ] Use `transformEntityWithImages()` for automatic image URL processing
- [ ] Provide sensible default values ([] for arrays, null for objects)
- [ ] Test error scenarios (network failure, server errors)
- [ ] Verify image URLs work across all environments

#### Screen/Component Guidelines:
- [ ] **Screens** can import and use services directly
- [ ] **Components** should receive processed data via props (no direct service imports)
- [ ] Use `buildAssetUrl()` for any manual image URL processing in components
- [ ] Never import `API_BASE_URL` directly in components

#### Environment Variables:
- [ ] Set `REACT_NATIVE_API_BASE_URL` for custom API endpoints
- [ ] Automatic Codespaces detection works out of the box
- [ ] Test in development (localhost), staging, and production environments

### Common Migration Patterns for Mobile-client-core

#### Before (Old Pattern):
```javascript
import { API_ENDPOINTS } from '../../../Shared/Constans/Api';
import { API_BASE_URL } from '../config/environment';

export const getCompanyInfo = async () => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.COMPANY}/info`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch company information');
  }
};

const getFullImageUrl = (relativePath) => {
  return `${API_BASE_URL}${relativePath}`;
};
```

#### After (New Pattern):
```javascript
import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';

const COMPANY_IMAGE_FIELDS = ['logo_url', 'banner_url', 'favicon_url'];

export const getCompanyInfo = async () => {
  const endpoint = buildApiEndpoint('company/info');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: { name: 'Nome do Salão' },
      transformData: (data) => transformEntityWithImages(data, COMPANY_IMAGE_FIELDS)
    }
  );
};

// No need for custom image URL functions - handled automatically
```

This ensures consistent implementation across Web-admin and Mobile-client-core while accommodating React Native's specific requirements.

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