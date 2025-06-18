# Mobile Client Core - AI Documentation

## Overview
This document contains key learnings, patterns, and best practices discovered during the development of the Mobile Client Core appointment booking system. This information helps avoid common pitfalls and ensures consistent implementation patterns.

## API Integration Patterns

### Backend Structure
- **Base URL**: `http://192.168.1.7:8000` (configurable via environment)
- **API Version**: `/api/v1/` prefix for all endpoints
- **Authentication**: JWT Bearer tokens stored in AsyncStorage
- **Roles**: `CLIENTE`, `PROFISSIONAL`, `ATENDENTE`, `GESTOR`

### Critical API Endpoints and Permissions

#### Professional Data
```javascript
// ✅ WORKS - Professionals for service (CLIENTE role allowed)
GET /api/v1/professionals/
// Filter on frontend: professionals.filter(prof => prof.services_offered.some(service => service.id === serviceId))

// ✅ WORKS - Weekly availability (CLIENTE role allowed)  
GET /api/v1/availability/professional/{id}/slots

// ❌ PERMISSION ISSUE - Daily availability (CLIENTE role restricted)
GET /api/v1/appointments/professional/{id}/availability?date=YYYY-MM-DD
```

#### Service Data
```javascript
// ✅ WORKS - Categories and services
GET /api/v1/categories/
GET /api/v1/categories/{categoryId}/services
```

### Authentication Issues and Solutions

#### Problem: 401 Unauthorized on Appointment Availability
**Root Cause**: `/api/v1/appointments/professional/{id}/availability` endpoint requires higher permissions than CLIENTE role.

**Solution**: Use fallback pattern with weekly availability
```javascript
export const getAvailableTimeSlots = async (serviceId, professionalId, date) => {
  try {
    // Try precise daily availability first
    const dailyAvailability = await getProfessionalDailyAvailability(professionalId, date);
    return dailyAvailability.slots.filter(slot => slot.is_available).map(slot => slot.start_time);
  } catch (dailyError) {
    // Fallback: Use weekly availability and generate time slots
    const weeklyAvailability = await getProfessionalWeeklyAvailability(professionalId);
    return generateTimeSlotsFromWeeklySchedule(weeklyAvailability, date);
  }
};
```

#### Problem: Auto-logout on Expected 401 Errors
**Root Cause**: API interceptor was logging users out on ALL 401 errors, including expected ones from fallback endpoints.

**Solution**: Smart 401 handling in API interceptor
```javascript
if (error.response?.status === 401) {
  // Don't auto-logout for appointment availability endpoint (expected 401 with fallback)
  const isAppointmentAvailabilityEndpoint = originalRequest.url?.includes('/appointments/professional/') && originalRequest.url?.includes('/availability');
  
  if (!isAppointmentAvailabilityEndpoint && !originalRequest._retry) {
    // Only logout for genuine auth issues
    await useAuthStore.getState().logout();
  }
}
```

### FastAPI URL Handling

#### Problem: 307 Redirect Losing Authorization Headers
**Root Cause**: FastAPI automatically redirects `/professionals` to `/professionals/` but drops Authorization headers.

**Solution**: Always include trailing slashes in endpoint URLs
```javascript
// ❌ BAD - Causes 307 redirect, loses auth headers
const response = await apiClient.get('/api/v1/professionals');

// ✅ GOOD - No redirect needed
const response = await apiClient.get('/api/v1/professionals/');
```

## Image URL Handling

### Backend Image Structure
```
/public/uploads/{tenant_id}/
├── professionals/
│   └── {professional_id}.jpg
├── services/
│   └── {service_id}.jpg
└── icons/
    └── {category_id}.png
```

### Mobile Image URL Construction
```javascript
const getFullImageUrl = (relativePath) => {
  if (!relativePath) return null;
  
  // Handle absolute URLs (replace localhost with mobile IP)
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath.replace('http://localhost:8000', API_BASE_URL);
  }
  
  // Handle relative paths
  return `${API_BASE_URL}${relativePath}`;
};
```

**Key Issue**: Backend may return `http://localhost:8000/...` URLs that are not accessible from mobile devices. Always replace with the actual server IP.

## Data Transformation Patterns

### Professional Data Mapping
Backend returns different field names than frontend expects:
```javascript
const transformedProfessionals = data.map(prof => ({
  ...prof,
  // Legacy support for existing components
  name: prof.full_name,           // full_name -> name
  image: prof.photo_url,          // photo_url -> image
}));
```

### Weekly Availability to Time Slots
Backend returns lowercase day names, but JavaScript uses numeric days:
```javascript
const slotDayMap = {
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
  'friday': 5, 'saturday': 6, 'sunday': 0  // Note: Sunday = 0
};

// Generate 30-minute slots
const timeSlots = [];
daySlots.forEach(slot => {
  const start = new Date(`1970-01-01T${slot.start_time}`);
  const end = new Date(`1970-01-01T${slot.end_time}`);
  
  while (start < end) {
    timeSlots.push(start.toTimeString().substring(0, 5)); // "HH:MM"
    start.setMinutes(start.getMinutes() + 30);
  }
});
```

## State Management Patterns

### Date Utilities
```javascript
// Generate 30-day date carousel
export const generateAvailableDates = (numberOfDays = 30) => {
  const dates = [];
  const today = new Date();
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    dates.push({
      day: dayNames[date.getDay()],
      date: date.getDate().toString(),
      month: monthNames[date.getMonth()],
      fullDate: date.toISOString().split('T')[0] // YYYY-MM-DD
    });
  }
  
  return dates;
};
```

### Loading State Management
Always implement proper loading states for async operations:
```javascript
const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
const [timeSlotsError, setTimeSlotsError] = useState(null);

// Clear previous state before loading
setIsLoadingTimeSlots(true);
setTimeSlotsError(null);

try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  setTimeSlotsError(error.message);
} finally {
  setIsLoadingTimeSlots(false);
}
```

## UI/UX Patterns

### Conditional Rendering for Loading States
```javascript
{(!selectedProfessional || !selectedDate) ? (
  <InfoMessage>Selecione um profissional e uma data...</InfoMessage>
) : isLoadingTimeSlots ? (
  <LoadingSpinner />
) : timeSlotsError ? (
  <ErrorWithRetry onRetry={retryFunction} />
) : availableTimes.length === 0 ? (
  <EmptyState>Nenhum horário disponível...</EmptyState>
) : (
  <TimeSlotGrid slots={availableTimes} />
)}
```

### Portuguese Localization
- **Days**: `['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']`
- **Months**: `['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']`
- **Date Format**: Use `YYYY-MM-DD` for API calls, display format for UI

## Common Pitfalls and Solutions

### 1. URL Construction Issues
❌ **Wrong**: Concatenating `/api/v1` multiple times
✅ **Right**: Set base URL once, use relative paths

### 2. Authentication Flow
❌ **Wrong**: Auto-logout on all 401 errors
✅ **Right**: Check endpoint context before logout

### 3. Image Loading
❌ **Wrong**: Using backend localhost URLs directly
✅ **Right**: Replace localhost with mobile-accessible IP

### 4. Date/Time Handling
❌ **Wrong**: Assuming backend uses uppercase day names
✅ **Right**: Use lowercase and normalize data

### 5. Error Boundaries
❌ **Wrong**: Silent failures without user feedback
✅ **Right**: Always show loading states, errors, and retry options

## Testing Checklist

When implementing new features, always test:

1. **Authentication States**
   - [ ] Logged in user can access endpoints
   - [ ] 401 errors are handled appropriately
   - [ ] Fallback mechanisms work

2. **Loading States**
   - [ ] Loading spinners appear
   - [ ] Error states display with retry
   - [ ] Empty states are handled

3. **Data Transformation**
   - [ ] Backend field names map correctly
   - [ ] Image URLs are accessible from mobile
   - [ ] Date/time formats are consistent

4. **Edge Cases**
   - [ ] Network failures
   - [ ] Empty API responses
   - [ ] Invalid date selections
   - [ ] Professional without availability

## Future Improvements

1. **API Caching**: Implement caching for professional data and availability
2. **Offline Support**: Cache critical data for offline access
3. **Real-time Updates**: WebSocket integration for live availability updates
4. **Performance**: Lazy loading for large professional lists
5. **Error Recovery**: Automatic retry with exponential backoff

## Architecture Decisions

### Why Fallback Pattern?
Instead of fixing backend permissions immediately, we implemented a robust fallback system that:
- Uses precise daily availability when available
- Falls back to weekly availability generation
- Provides immediate functionality while backend evolves
- Maintains consistent user experience

### Why Smart 401 Handling?
Rather than disabling all 401 auto-logout, we implemented context-aware handling that:
- Preserves security for genuine auth failures
- Allows expected 401s for fallback patterns
- Maintains user session stability during normal operation

This approach ensures both security and functionality without compromising either.