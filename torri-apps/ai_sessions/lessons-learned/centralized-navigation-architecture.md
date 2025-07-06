# Centralized Navigation Architecture

## Overview
A clean, maintainable navigation architecture that centralizes all routing logic, making it easy to change navigation behavior across the entire application from a single location.

## Architecture Benefits

1. **Single Source of Truth**: All routes defined in one place (`shared/navigation/index.js`)
2. **Type Safety**: Route functions prevent typos and provide IntelliSense
3. **DRY Principle**: No repeated tenant logic across components
4. **Easy Refactoring**: Change routes in one place, updates everywhere
5. **Tenant Agnostic**: Components don't need to know about tenant logic
6. **Testable**: Navigation logic can be tested in isolation
7. **Performance**: Memoized calculations and lazy loading

## Core Components

### 1. Route Constants (`shared/navigation/index.js`)
```javascript
export const ROUTES = {
  DASHBOARD: '/dashboard',
  SERVICES: '/services',
  // Dynamic routes with parameters
  CLIENT_EDIT: (id) => `/clients/edit/${id}`,
}
```

### 2. Navigation Hook (`shared/hooks/useNavigation.js`)
```javascript
const { navigate, buildRoute, isActive } = useNavigation();
```

### 3. Tenant Utilities (`shared/utils/tenant.js`)
```javascript
const tenantInfo = getTenantInfo();
const apiUrl = buildApiUrl();
```

### 4. Navigation Provider (Optional)
For complex apps, wrap components with NavigationProvider for context access.

## Integration Steps

### Step 1: Install Shared Components
1. Copy the `shared` folder to your project root
2. Update import paths in `shared/hooks/useNavigation.js`:
   - Web-admin: `import { getTenantInfo } from '../../Web-admin/Src/Utils/apiHelpers'`
   - App-client: `import { getTenantInfo } from '../../App-client/src/utils/apiHelpers'`

### Step 2: Update App Root
```javascript
// Web-admin/Src/App.jsx or App-client/src/App.jsx
import { NavigationProvider } from '../shared/providers/NavigationProvider';

function App() {
  return (
    <NavigationProvider>
      {/* existing app content */}
    </NavigationProvider>
  );
}
```

### Step 3: Refactor Components

#### Simple Navigation
```javascript
// Before
navigate(`/${tenantSlug}/dashboard`);

// After
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';

const { navigate } = useNavigation();
navigate(ROUTES.DASHBOARD);
```

#### Dynamic Routes
```javascript
// Before
navigate(`/${tenantSlug}/clients/edit/${clientId}`);

// After
navigate(ROUTES.ADMIN.CLIENTS.EDIT(clientId));
```

#### Navigation Components
```javascript
// Before - Hardcoded menu items
const menuItems = [
  { label: 'Home', path: `/${tenantSlug}/dashboard` },
  { label: 'Services', path: `/${tenantSlug}/services` },
];

// After - Using config
import { useNavigationContext } from '../shared/providers/NavigationProvider';

const { config } = useNavigationContext();
const menuItems = config.CLIENT; // Automatically has correct routes
```

### Step 4: Update API Calls
```javascript
// Before
const apiUrl = `/api/v1/${tenantSlug}/services`;

// After
import { buildApiUrl } from '../shared/utils/tenant';

const apiUrl = `${buildApiUrl()}/services`;
```

## Best Practices

### 1. Always Use Route Constants
```javascript
// ❌ Bad
navigate('/dashboard');

// ✅ Good
navigate(ROUTES.DASHBOARD);
```

### 2. Use Dynamic Route Functions
```javascript
// ❌ Bad
navigate(`/clients/edit/${id}`);

// ✅ Good
navigate(ROUTES.ADMIN.CLIENTS.EDIT(id));
```

### 3. Centralize Navigation Logic
```javascript
// ❌ Bad - Logic scattered in components
if (userRole === 'PROFESSIONAL') {
  navigate(`/${tenantSlug}/professional/dashboard`);
} else {
  navigate(`/${tenantSlug}/dashboard`);
}

// ✅ Good - Logic in navigation config
const getDefaultRoute = (userRole) => {
  return userRole === 'PROFESSIONAL' 
    ? ROUTES.PROFESSIONAL.DASHBOARD 
    : ROUTES.DASHBOARD;
};
navigate(getDefaultRoute(userRole));
```

### 4. Use Navigation Context for Complex Components
```javascript
// For components that need multiple navigation features
const { navigate, isActive, config } = useNavigationContext();
```

## Migration Strategy

### Phase 1: Setup Infrastructure
1. Add shared navigation components
2. Test with a single component
3. Verify tenant detection works correctly

### Phase 2: Incremental Migration
1. Start with navigation components (menus, sidebars)
2. Update forms and action handlers
3. Update remaining components

### Phase 3: Cleanup
1. Remove old navigation utilities
2. Update tests
3. Document any custom patterns

## Testing

### Unit Tests
```javascript
import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '../shared/hooks/useNavigation';

test('buildRoute adds tenant slug when needed', () => {
  const { result } = renderHook(() => useNavigation());
  const route = result.current.buildRoute('/dashboard');
  expect(route).toBe('/tenant-slug/dashboard'); // When slug-based
});
```

### Integration Tests
```javascript
test('navigation works correctly', () => {
  const { navigate } = render(<ComponentWithNavigation />);
  fireEvent.click(screen.getByText('Go to Dashboard'));
  expect(mockNavigate).toHaveBeenCalledWith('/tenant-slug/dashboard');
});
```

## Future Enhancements

1. **Route Guards**: Add permission checks in navigation
2. **Analytics**: Track navigation events centrally
3. **Breadcrumbs**: Auto-generate from route config
4. **Deep Linking**: Handle external links with tenant awareness
5. **Route Aliases**: Support multiple paths for same route

## Conclusion

This architecture provides a clean, maintainable solution for navigation that:
- Eliminates code duplication
- Makes changes easy and safe
- Provides better developer experience
- Scales well with application growth
- Maintains clean architecture principles