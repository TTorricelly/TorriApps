# Navigation Pattern Update Analysis

## Overview
This document lists all files that have hardcoded navigation patterns using `navigate(\`/${tenantSlug}/...\`)` that need to be updated to use the `getTenantInfo()` helper and `buildRoute()` pattern.

## Web-admin Files to Update

### High Priority (Core CRUD operations - frequently used)
1. **ServiceForm.jsx** - `/Web-admin/Src/Pages/Services/ServiceForm.jsx`
   - Occurrences: 6
   - Purpose: Service creation/editing form
   - Priority: HIGH (core business feature)

2. **UserForm.jsx** - `/Web-admin/Src/Pages/Users/UserForm.jsx`
   - Occurrences: 5
   - Purpose: User creation/editing form
   - Priority: HIGH (user management is critical)

3. **ClientForm.jsx** - `/Web-admin/Src/Pages/Clients/ClientForm.jsx`
   - Occurrences: 4
   - Purpose: Client creation/editing form
   - Priority: HIGH (client management is core)

4. **ProfessionalForm.jsx** - `/Web-admin/Src/Pages/Professionals/ProfessionalForm.jsx`
   - Occurrences: 4
   - Purpose: Professional creation/editing form
   - Priority: HIGH (professional management is core)

### Medium Priority (List pages - less critical than forms)
5. **ServicesPage.jsx** - `/Web-admin/Src/Pages/Services/ServicesPage.jsx`
   - Occurrences: 2
   - Purpose: Services listing page
   - Priority: MEDIUM

6. **UsersPage.jsx** - `/Web-admin/Src/Pages/Users/UsersPage.jsx`
   - Occurrences: 2
   - Purpose: Users listing page
   - Priority: MEDIUM

7. **ProfessionalsPage.jsx** - `/Web-admin/Src/Pages/Professionals/ProfessionalsPage.jsx`
   - Occurrences: 2
   - Purpose: Professionals listing page
   - Priority: MEDIUM

## App-client Files to Update

### High Priority (Core user-facing features)
1. **ProfessionalMenuPage.jsx** - `/App-client/src/pages/ProfessionalMenuPage.jsx`
   - Occurrences: 4
   - Purpose: Professional's main menu/dashboard
   - Priority: HIGH (professionals use this daily)

2. **ClientDetailPage.jsx** - `/App-client/src/pages/ClientDetailPage.jsx`
   - Occurrences: 4
   - Purpose: Client detail view
   - Priority: HIGH (frequently accessed)

3. **ProfilePage.jsx** - `/App-client/src/pages/ProfilePage.jsx`
   - Occurrences: 4
   - Purpose: User profile page
   - Priority: HIGH (user profile management)

4. **ClientFormPage.jsx** - `/App-client/src/pages/ClientFormPage.jsx`
   - Occurrences: 3
   - Purpose: Client creation/editing
   - Priority: HIGH (client management)

5. **ServicesPage.jsx** - `/App-client/src/pages/ServicesPage.jsx`
   - Occurrences: 3
   - Purpose: Service selection page
   - Priority: HIGH (booking flow start)

6. **ClientsPage.jsx** - `/App-client/src/pages/ClientsPage.jsx`
   - Occurrences: 3
   - Purpose: Clients listing
   - Priority: HIGH (professional's client management)

### Medium Priority (Important but less frequently used)
7. **ProfessionalAgendaPage.jsx** - `/App-client/src/pages/ProfessionalAgendaPage.jsx`
   - Occurrences: 2
   - Purpose: Professional's agenda/calendar
   - Priority: MEDIUM

8. **SchedulingWizardPage.jsx** - `/App-client/src/pages/SchedulingWizardPage.jsx`
   - Occurrences: 2
   - Purpose: Booking wizard
   - Priority: MEDIUM

### Low Priority (Supporting features)
9. **HomePage.jsx** - `/App-client/src/pages/HomePage.jsx`
   - Occurrences: 1
   - Purpose: Landing/home page
   - Priority: LOW

10. **EditProfilePage.jsx** - `/App-client/src/pages/EditProfilePage.jsx`
    - Occurrences: 1
    - Purpose: Profile editing
    - Priority: LOW

11. **AppointmentsPage.jsx** - `/App-client/src/pages/AppointmentsPage.jsx`
    - Occurrences: 1
    - Purpose: Appointments listing
    - Priority: LOW

12. **WizardConfirmationScreen.jsx** - `/App-client/src/components/wizard/WizardConfirmationScreen.jsx`
    - Occurrences: 1
    - Purpose: Booking confirmation step
    - Priority: LOW

13. **RoleDebugger.jsx** - `/App-client/src/components/RoleDebugger.jsx`
    - Occurrences: 2
    - Purpose: Debug component
    - Priority: LOW (development tool)

## Implementation Pattern

All files should be updated to follow this pattern:

```javascript
import { getTenantInfo } from '../../Utils/apiHelpers'; // or '../utils/apiHelpers' for App-client

// Inside component:
const tenantInfo = getTenantInfo();

const buildRoute = (path) => {
  if (!tenantInfo?.slug) return path;
  return `/${tenantInfo.slug}${path}`;
};

// Replace navigation calls:
// OLD: navigate(`/${tenantSlug}/services/create`);
// NEW: navigate(buildRoute('/services/create'));
```

## Summary
- **Total Web-admin files**: 7 files with 25 total occurrences
- **Total App-client files**: 13 files with 30 total occurrences
- **Grand Total**: 20 files with 55 navigation patterns to update

## Recommended Update Order
1. Start with HIGH priority files in both projects
2. Focus on forms first (they have more navigation patterns)
3. Then update listing pages
4. Finally update low-priority supporting pages