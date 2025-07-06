# Navigation Update Checklist

## Quick Reference Pattern
```javascript
// Add to imports
import { getTenantInfo } from '../utils/apiHelpers';

// Add to component
const tenantInfo = getTenantInfo();
const useSlugInUrl = tenantInfo?.method === 'slug';
const currentTenantSlug = tenantSlug || tenantInfo?.slug;

const buildRoute = (path) => {
  if (useSlugInUrl && currentTenantSlug) {
    return `/${currentTenantSlug}${path}`;
  }
  return path;
};

// Replace navigation
navigate(buildRoute('/path'));
```

## Web-admin Files Checklist

### High Priority Forms
- [ ] ServiceForm.jsx (5 changes)
- [ ] UserForm.jsx (2 changes)
- [ ] ClientForm.jsx (2 changes)
- [ ] ProfessionalForm.jsx (6 changes)

### Medium Priority Lists
- [ ] ServicesPage.jsx (4 changes)
- [ ] UsersPage.jsx (4 changes)
- [ ] ProfessionalsPage.jsx (2 changes)

## App-client Files Checklist

### High Priority
- [ ] ProfessionalMenuPage.jsx (6 changes)
- [ ] ClientFormPage.jsx (3 changes)
- [ ] EditProfilePage.jsx (1 change)
- [ ] HomePage.jsx (1 change)
- [ ] ProfessionalAgendaPage.jsx (2 changes)
- [ ] WizardConfirmationScreen.jsx (1 change)

### Medium Priority
- [ ] ClientDetailPage.jsx (3 changes)
- [ ] ClientsPage.jsx (5 changes)

### Low Priority
- [ ] RoleDebugger.jsx (2 changes)
- [ ] ProfessionalDashboardPage.jsx (2 changes)
- [ ] KanbanBoardPage.jsx (2 changes)
- [ ] ComingSoonPage.jsx (1 change)
- [ ] ServicesPage.jsx (1 change)

## Testing Checklist

### After Each File Update
- [ ] Component renders without errors
- [ ] Navigation links work correctly
- [ ] Back navigation works

### Final Testing
- [ ] Test with domain-based tenant (e.g., tenant1.com.br)
- [ ] Test with slug-based tenant (e.g., vervio.com.br/tenant-1)
- [ ] Test navigation between all major sections
- [ ] Test form submissions and redirects
- [ ] Test professional/client mode switching

## Progress Tracking
Total Files: 20
- Web-admin: 0/7 completed
- App-client: 0/13 completed

Total Changes: ~55
- Web-admin: 0/25 completed
- App-client: 0/30 completed