# Navigation Update Implementation Plan

## Overview
This plan outlines the systematic update of all hardcoded navigation patterns in Web-admin and App-client to support domain-based multi-tenant architecture.

## Current Status
- ✅ Backend: Fully updated to support domain-based tenants
- ✅ Frontend Core Components: Navigation components updated
- ⏳ Frontend Pages: 20 files need updating (7 in Web-admin, 13 in App-client)

## Implementation Pattern

All pages need to be updated from:
```javascript
navigate(`/${tenantSlug}/path`)
```

To:
```javascript
// Add import
import { getTenantInfo } from '../utils/apiHelpers';

// In component, add helper
const tenantInfo = getTenantInfo();
const useSlugInUrl = tenantInfo?.method === 'slug';
const currentTenantSlug = tenantSlug || tenantInfo?.slug;

const buildRoute = (path) => {
  if (useSlugInUrl && currentTenantSlug) {
    return `/${currentTenantSlug}${path}`;
  }
  return path;
};

// Use in navigation
navigate(buildRoute('/path'))
```

## Phase 1: Web-admin Updates (7 files, ~25 changes)

### High Priority (Forms - 4 files)
These are critical for content management:

1. **ServiceForm.jsx** (5 occurrences)
   - Path: `/Pages/Services/ServiceForm.jsx`
   - Impact: Service creation/editing
   - Update: Add getTenantInfo import and buildRoute helper

2. **UserForm.jsx** (2 occurrences)
   - Path: `/Pages/Users/UserForm.jsx`
   - Impact: User management
   - Update: Add getTenantInfo import and buildRoute helper

3. **ClientForm.jsx** (2 occurrences)
   - Path: `/Pages/Clients/ClientForm.jsx`
   - Impact: Client management
   - Update: Add getTenantInfo import and buildRoute helper

4. **ProfessionalForm.jsx** (6 occurrences)
   - Path: `/Pages/Professionals/ProfessionalForm.jsx`
   - Impact: Professional management
   - Update: Add getTenantInfo import and buildRoute helper

### Medium Priority (Listing Pages - 3 files)
These are frequently accessed but already have working navigation components:

5. **ServicesPage.jsx** (4 occurrences)
   - Path: `/Pages/Services/ServicesPage.jsx`
   - Impact: Service listing
   - Update: Add getTenantInfo import and buildRoute helper

6. **UsersPage.jsx** (4 occurrences)
   - Path: `/Pages/Users/UsersPage.jsx`
   - Impact: User listing
   - Update: Add getTenantInfo import and buildRoute helper

7. **ProfessionalsPage.jsx** (2 occurrences)
   - Path: `/Pages/Professionals/ProfessionalsPage.jsx`
   - Impact: Professional listing
   - Update: Add getTenantInfo import and buildRoute helper

## Phase 2: App-client Updates (13 files, ~30 changes)

### High Priority (Core Features - 6 files)
These are essential for daily operations:

1. **ProfessionalMenuPage.jsx** (6 occurrences)
   - Path: `/pages/ProfessionalMenuPage.jsx`
   - Impact: Professional interface navigation
   - Update: Add getTenantInfo import and buildRoute helper

2. **ClientFormPage.jsx** (3 occurrences)
   - Path: `/pages/ClientFormPage.jsx`
   - Impact: Client registration
   - Update: Add getTenantInfo import and buildRoute helper

3. **EditProfilePage.jsx** (1 occurrence)
   - Path: `/pages/EditProfilePage.jsx`
   - Impact: Profile management
   - Update: Add getTenantInfo import and buildRoute helper

4. **HomePage.jsx** (1 occurrence)
   - Path: `/pages/HomePage.jsx`
   - Impact: Main landing page
   - Update: Add getTenantInfo import and buildRoute helper

5. **ProfessionalAgendaPage.jsx** (2 occurrences)
   - Path: `/pages/ProfessionalAgendaPage.jsx`
   - Impact: Professional scheduling
   - Update: Add getTenantInfo import and buildRoute helper

6. **WizardConfirmationScreen.jsx** (1 occurrence)
   - Path: `/components/wizard/WizardConfirmationScreen.jsx`
   - Impact: Booking confirmation
   - Update: Add getTenantInfo import and buildRoute helper

### Medium Priority (Important Features - 2 files)

7. **ClientDetailPage.jsx** (3 occurrences)
   - Path: `/pages/ClientDetailPage.jsx`
   - Impact: Client details view
   - Update: Add getTenantInfo import and buildRoute helper

8. **ClientsPage.jsx** (5 occurrences)
   - Path: `/pages/ClientsPage.jsx`
   - Impact: Client listing
   - Update: Add getTenantInfo import and buildRoute helper

### Low Priority (Supporting Features - 5 files)

9. **RoleDebugger.jsx** (2 occurrences)
   - Path: `/components/RoleDebugger.jsx`
   - Impact: Debug tool
   - Update: Add getTenantInfo import and buildRoute helper

10. **ProfessionalDashboardPage.jsx** (2 occurrences)
    - Path: `/pages/ProfessionalDashboardPage.jsx`
    - Impact: Dashboard
    - Update: Add getTenantInfo import and buildRoute helper

11. **KanbanBoardPage.jsx** (2 occurrences)
    - Path: `/pages/KanbanBoardPage.jsx`
    - Impact: Kanban view
    - Update: Add getTenantInfo import and buildRoute helper

12. **ComingSoonPage.jsx** (1 occurrence)
    - Path: `/pages/ComingSoonPage.jsx`
    - Impact: Placeholder page
    - Update: Add getTenantInfo import and buildRoute helper

13. **ServicesPage.jsx** (1 occurrence)
    - Path: `/pages/ServicesPage.jsx`
    - Impact: Service selection
    - Update: Add getTenantInfo import and buildRoute helper

## Implementation Steps

### Step 1: Create Reusable Hook (Optional)
Consider creating a custom hook to reduce code duplication:

```javascript
// utils/useNavigation.js
import { useNavigate, useParams } from 'react-router-dom';
import { getTenantInfo } from './apiHelpers';

export const useAppNavigation = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  
  const tenantInfo = getTenantInfo();
  const useSlugInUrl = tenantInfo?.method === 'slug';
  const currentTenantSlug = tenantSlug || tenantInfo?.slug;
  
  const buildRoute = (path) => {
    if (useSlugInUrl && currentTenantSlug) {
      return `/${currentTenantSlug}${path}`;
    }
    return path;
  };
  
  const navigateTo = (path) => navigate(buildRoute(path));
  
  return { navigate: navigateTo, buildRoute };
};
```

### Step 2: Update Each File
For each file:
1. Add import for getTenantInfo (or useAppNavigation hook)
2. Add buildRoute helper function (or use hook)
3. Replace all navigate calls with buildRoute pattern
4. Test the navigation

### Step 3: Testing Strategy
1. Test domain-based tenant access (e.g., tenant1.com.br)
2. Test slug-based tenant access (e.g., vervio.com.br/tenant-1)
3. Verify all navigation flows work correctly
4. Check that back navigation works properly

## Estimated Time
- Phase 1 (Web-admin): 2-3 hours
- Phase 2 (App-client): 3-4 hours
- Testing: 2 hours
- Total: 7-9 hours

## Risk Mitigation
1. Update files in small batches
2. Test each batch before proceeding
3. Keep existing pattern as fallback during transition
4. Use version control to track changes

## Success Criteria
- [ ] All hardcoded navigation patterns removed
- [ ] Both domain and slug-based navigation work
- [ ] No broken navigation links
- [ ] Code is DRY (consider using custom hook)
- [ ] All tests pass