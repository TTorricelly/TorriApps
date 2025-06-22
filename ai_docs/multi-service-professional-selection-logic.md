# Multi-Service Professional Selection Logic

## Overview

This document describes the intelligent professional selection logic implemented in the TorriApps scheduling wizard. The system automatically determines the minimum number of professionals required based on service coverage constraints and enables appropriate selections without requiring manual user intervention.

## Problem Statement

### Original Issue
When users selected multiple services that required different professionals (e.g., Service A only available from Professional 1, Service B only available from Professional 2), the system would:

1. Initially default to requiring only 1 professional
2. Show all other professionals as "grayed out" and unselectable
3. Force users to manually change the sequence selection from "1 professional" to "2 professionals" to enable additional selections
4. Create a poor UX where the system appeared broken until manual intervention

### Business Context
In beauty salons, different professionals often specialize in different services:
- **Hair services**: Coloração, Corte, Escova (typically hair professionals)
- **Nail services**: Manicure, Pedicure (typically nail technicians)  
- **Specialized treatments**: Botox Capilar, specific treatments

When clients book multiple services across specialties, multiple professionals are mandatory, not optional.

## Solution Architecture

The professional selection logic is implemented across both frontend and backend systems:

- **Frontend**: Determines minimum professionals needed and enables UI selections
- **Backend**: Generates valid resource combinations and validates availability

### Frontend Logic: `calculateMinimumProfessionalsNeeded()`

**Location**: `SchedulingWizardProfessionalsScreen.tsx`

```typescript
const calculateMinimumProfessionalsNeeded = (services: Service[], professionals: Professional[]): number => {
  if (services.length === 0 || professionals.length === 0) return 1;
  if (services.length === 1) return 1; // Single service always needs 1 professional
  
  // Check if any single professional can handle ALL services
  const professionalsWhoCanHandleAll = professionals.filter((prof: Professional) => {
    return services.every((service: Service) => 
      prof.services_offered?.includes(service.id)
    );
  });
  
  // If at least one professional can handle all services, we only need 1
  if (professionalsWhoCanHandleAll.length > 0) {
    return 1;
  }
  
  // If no single professional can handle all services, we need multiple
  return Math.min(2, professionals.length);
};
```

### Backend Logic: Resource Combination Generation

**Location**: `multi_service_availability_service.py`

The backend implements a sophisticated fallback system that mirrors the frontend logic:

#### 1. Single Professional Validation
```python
def _professional_can_handle_all_services(
    self,
    professional: User,
    service_requirements: List[ServiceRequirement]
) -> bool:
    """Check if a single professional can handle all services."""
    professional_service_ids = {service.id for service in professional.services_offered}
    required_service_ids = {req.service.id for req in service_requirements}
    return required_service_ids.issubset(professional_service_ids)
```

#### 2. Multi-Professional Combination Logic
```python
def _generate_resource_combinations(
    self,
    service_requirements: List[ServiceRequirement],
    eligible_professionals: List[User],
    professionals_requested: int
) -> List[ResourceCombination]:
    
    # Try single professional first
    if professionals_requested == 1 or max_parallel_pros == 1:
        for professional in eligible_professionals:
            if self._professional_can_handle_all_services(professional, service_requirements):
                # Create single professional combination
                resource_combinations.append(ResourceCombination(...))
    
    # Multi-professional fallback when single professional approach fails
    if len(resource_combinations) == 0 and len(service_requirements) > 1:
        for prof_pair in combinations(eligible_professionals, 2):
            if self._professional_pair_can_handle_services(prof_pair, service_requirements):
                # Create multi-professional combination
                resource_combinations.append(ResourceCombination(...))
```

#### 3. Professional Pair Validation
```python
def _professional_pair_can_handle_services(
    self,
    professional_pair: Tuple[User, User],
    service_requirements: List[ServiceRequirement]
) -> bool:
    """Check if a pair of professionals can handle all services together."""
    combined_service_ids = set()
    for professional in professional_pair:
        combined_service_ids.update(service.id for service in professional.services_offered)
    
    required_service_ids = {req.service.id for req in service_requirements}
    return required_service_ids.issubset(combined_service_ids)
```

### Decision Matrix

| Scenario | Services | Professional Coverage | Required Professionals | Auto-Update |
|----------|----------|----------------------|----------------------|------------|
| Single Service | 1 service | Any professional can handle it | 1 | No |
| Multi-Service (All-in-One) | 2+ services | ≥1 professional can handle ALL services | 1 | No |
| Multi-Service (Exclusive) | 2+ services | NO professional can handle all services | 2+ | **Yes** |

### Frontend-Backend Coordination

#### Workflow Interaction
1. **Frontend Determines Minimum**: Calculates `minProfessionalsNeeded` based on service coverage
2. **Frontend Updates UI**: Sets `professionalsRequested` and enables professional selection
3. **User Makes Selections**: Selects professionals based on enabled options
4. **Backend Validates**: Ensures selected professionals can actually handle the services
5. **Backend Generates Combinations**: Creates valid resource combinations for scheduling
6. **Backend Provides Fallback**: If single professional fails, automatically tries pairs

#### Consistency Logic
Both frontend and backend use the same core principle:
- **Check Single Professional First**: Can any one professional handle all services?
- **Fallback to Multiple**: If not, require multiple professionals
- **Validate Coverage**: Ensure all services are covered by selected professionals

The frontend focuses on **UX enablement** while the backend focuses on **availability validation**.

### Integration Points

#### 1. Auto-Selection Logic (`loadAvailableProfessionals`)
```typescript
// Calculate minimum professionals needed based on service coverage
const minProfessionalsNeeded = calculateMinimumProfessionalsNeeded(selectedServices, professionals);

if (autoSelectedProfessionals.length > 0) {
  // If we need more professionals than currently requested, auto-update the count
  const requiredCount = Math.max(autoSelectedProfessionals.length, minProfessionalsNeeded);
  if (requiredCount > professionalsRequested) {
    setProfessionalsRequested(requiredCount);
  }
} else {
  // No auto-selected professionals, but still check if we need more than 1
  if (minProfessionalsNeeded > professionalsRequested) {
    setProfessionalsRequested(minProfessionalsNeeded);
  }
}
```

#### 2. Selection Enablement Logic
```typescript
const renderProfessionalChip = ({ item: professional }: { item: Professional }) => {
  const isSelected = selectedProfessionals.some((prof: Professional | null) => prof?.id === professional.id);
  
  // Simplified logic: Allow selection up to professionalsRequested count
  const canSelect = !isSelected && getSelectedCount() < professionalsRequested;
  
  const isDisabled = !isSelected && !canSelect;
  // ... render logic
};
```

## Execution Flow

### Phase 1: Initial Load
1. **Configuration Load** (`loadConfiguration`): Sets initial `professionalsRequested` based on service count and defaults
2. **Professional Load** (`loadAvailableProfessionals`): Loads available professionals and analyzes service coverage
3. **Minimum Calculation**: Determines minimum professionals needed via `calculateMinimumProfessionalsNeeded()`
4. **Auto-Update**: If minimum > current request, automatically updates `professionalsRequested`

### Phase 2: Rendering
1. **Professional Chips**: Rendered with updated `professionalsRequested` count
2. **Selection Logic**: Enables selection up to the required count
3. **Visual State**: No professionals are grayed out inappropriately

### Phase 3: User Interaction
1. **Selection**: Users can select professionals up to the required minimum
2. **Manual Override**: Users can still manually adjust via sequence selection if needed
3. **Validation**: System ensures all services are covered before proceeding

## Example Scenarios

### Scenario 1: Hair + Nail Services
- **Services**: Coloração (Hair) + Manicure (Nails)
- **Professionals**: 
  - Hair Professional: Can do Coloração only
  - Nail Professional: Can do Manicure only
- **Logic**: No single professional can handle both → Minimum = 2
- **Result**: Both professionals become selectable immediately

### Scenario 2: Multiple Hair Services  
- **Services**: Coloração + Corte (both hair services)
- **Professionals**:
  - Hair Professional A: Can do both Coloração and Corte
  - Hair Professional B: Can do both Coloração and Corte
- **Logic**: Multiple professionals can handle all services → Minimum = 1
- **Result**: Normal single-professional selection logic applies

### Scenario 3: Mixed Coverage
- **Services**: Service A + Service B + Service C
- **Professionals**:
  - Professional 1: Can do Service A + Service B
  - Professional 2: Can do Service B + Service C  
  - Professional 3: Can do Service C only
- **Logic**: No single professional can handle all three → Minimum = 2
- **Result**: Auto-enables 2-professional selection

## Technical Implementation Details

### Key Functions

#### Frontend Functions
1. **`calculateMinimumProfessionalsNeeded()`**: Core algorithm for determining minimum professionals
2. **`loadAvailableProfessionals()`**: Integration point that applies the logic
3. **`renderProfessionalChip()`**: UI rendering that respects the calculated requirements
4. **`isValidSelection()`**: Validation logic ensuring service coverage

#### Backend Functions
5. **`_generate_resource_combinations()`**: Main backend logic for creating valid professional combinations
6. **`_professional_can_handle_all_services()`**: Single professional validation
7. **`_professional_pair_can_handle_services()`**: Multi-professional pair validation
8. **`get_available_slots()`**: Main API endpoint that orchestrates the availability logic

### State Management
- **`professionalsRequested`**: Core state that drives selection limits
- **`selectedProfessionals`**: Array tracking current selections
- **`availableProfessionals`**: Available professionals for the date/services

### Error Prevention
- Prevents scenarios where required professionals are unavailable for selection
- Maintains backward compatibility with manual sequence selection
- Handles edge cases (empty lists, single services, etc.)

## Benefits

### User Experience
- **Seamless Selection**: No manual intervention required for obvious multi-professional scenarios
- **Intuitive Behavior**: System behaves as users expect it to
- **Reduced Friction**: Eliminates confusion about grayed-out professionals

### Business Logic
- **Accurate Requirements**: Respects actual professional specialization constraints
- **Flexible Operations**: Supports both single and multi-professional workflows
- **Scalable**: Works with any number of services and professionals

## Future Enhancements

### Potential Improvements
1. **Advanced Optimization**: More sophisticated algorithms for optimal professional assignment
2. **Time-Based Logic**: Consider professional availability windows for smarter defaults
3. **Preference Learning**: Learn from user patterns to improve automatic selections
4. **Cost Optimization**: Factor in professional rates for economical suggestions

### Monitoring Points
- Track scenarios where auto-selection occurs vs. manual overrides
- Monitor user satisfaction with automatic professional count suggestions
- Analyze service combination patterns for further optimization opportunities

## Related Documentation
- [Multi-Service Scheduling Wizard Spec](../ai_specs/multi-service-scheduling-wizard-spec.md)
- [Mobile Architecture](./mobile-architecture.md)
- [Best Practices](./best-practices.md)