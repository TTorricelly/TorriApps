# TorriApps Appointment Creation Refactoring Specification

## Document Information
- **Version**: 1.0
- **Date**: July 14, 2025
- **Author**: AI Code Assistant
- **Status**: Draft - Awaiting Review

## Executive Summary

The TorriApps system currently has **7 distinct appointment creation patterns** across multiple frontends and backends, resulting in significant code duplication and architectural inconsistencies. This specification outlines a comprehensive refactoring plan to unify appointment creation using Domain-Driven Design (DDD), Factory Pattern, and modern best practices.

**Key Goals:**
- Eliminate 90% of duplicate appointment creation logic
- Unify business rules across all creation methods
- Implement consistent pricing/duration calculations
- Create maintainable, testable architecture
- Support future unified multi-appointment vision

## Current State Analysis

### 1. Backend Appointment Creation Patterns

#### Pattern 1: Legacy Single Appointment Creation
- **Route**: `POST /appointments`
- **File**: `Backend/Modules/Appointments/routes.py:122-145`
- **Service**: `appointment_crud.py:create_appointment()`
- **Status**: 🔴 **DEPRECATED** - Will be replaced with unified multi-appointment system
- **Issues**: 
  - Creates unnecessary AppointmentGroup for single appointments
  - Limited validation
  - Inconsistent with modern patterns

#### Pattern 2: Multi-Service Wizard Booking
- **Route**: `POST /appointments/wizard/book`
- **File**: `Backend/Modules/Appointments/routes.py:736-755`
- **Service**: `wizard_service.py:create_multi_service_booking()`
- **Features**:
  - Supports parallel/sequential execution
  - Advanced availability checking
  - Complex time slot management
- **Issues**:
  - Duplicated pricing logic
  - Complex validation scattered across functions

#### Pattern 3: Walk-in Appointments (Individual Assignments)
- **Route**: `POST /appointments/walk-in`
- **File**: `Backend/Modules/Appointments/routes.py:262-318`
- **Service**: `kanban_service.py:create_walk_in_appointment_group_with_assignments()`
- **Features**:
  - Individual professional assignments per service
  - Immediate appointment creation
  - Client creation/lookup
- **Issues**:
  - Duplicated client handling logic
  - Pricing calculations repeated from other patterns

#### Pattern 4: Add Services to Existing Group
- **Route**: `POST /appointments/add-services/{group_id}`
- **File**: `Backend/Modules/Appointments/routes.py:321-377`
- **Service**: `kanban_service.py:add_services_to_appointment_group()`
- **Features**:
  - Extends existing appointment groups
  - Consecutive scheduling
- **Issues**:
  - Similar pricing/duration logic as creation patterns

### 2. Frontend Appointment Creation Patterns

#### Pattern A: Web-admin Kanban Walk-in
- **Location**: `Web-admin/Src/Pages/Appointments/KanbanPage.jsx`
- **Modal**: `AddServicesModal.jsx`
- **Flow**: 3-step process (Client → Services → Professional)
- **API**: `appointmentsApi.js:createWalkInAppointment()`
- **Features**:
  - Service variation selection
  - Individual professional assignment
  - Real-time price calculation

#### Pattern B: App-client Walk-in
- **Location**: `App-client/src/components/WalkInModal.jsx`
- **Flow**: 3-step modal (Client → Services → Professional)
- **API**: `appointmentService.js:createWalkInAppointment()`
- **Issues**:
  - Duplicates Web-admin logic
  - Separate API service implementation

#### Pattern C: App-client Scheduling Wizard
- **Location**: `App-client/src/components/SchedulingWizardModal.jsx`
- **Flow**: 6 wizard screens
- **API**: `wizardApiService.js:createMultiServiceBooking()`
- **Features**:
  - Advanced date/time selection
  - Professional availability checking
  - Multi-service coordination

#### Pattern D: Legacy Single Appointment (Web-admin)
- **API**: `appointmentsApi.js:createAppointment()`
- **Status**: 🔴 **DEPRECATED** - Inconsistent usage

### 3. Code Duplication Analysis

#### Critical Duplications (Exact Code)

**1. Price/Duration Calculations** (4 instances)
```python
# Location 1: kanban_service.py:265-284
final_price = service.price + (variation.price_delta if variation else 0)
final_duration = (service.duration_minutes + service.processing_time + 
                 service.finishing_time + (variation.duration_delta if variation else 0))

# Location 2: wizard_service.py:153-166 (similar logic)
# Location 3: appointment_crud.py:81-82 (basic version)
# Location 4: Frontend AddServicesModal.jsx:373-378
```

**2. Client Creation/Lookup Logic** (3 instances)
```python
# Location 1: kanban_service.py:210-248
# Location 2: kanban_service.py:384-422 (in older function)
if client_data.get('id'):
    client = db.query(User).filter(User.id == client_data['id']).first()
else:
    if client_data.get('email'):
        client = db.query(User).filter(User.email == client_data['email']).first()
    if not client:
        client = User(...)  # Create new client
```

**3. Professional Assignment Patterns** (3 instances)
- Individual service assignments in walk-in flows
- Wizard professional selection logic
- Manual assignment in kanban interface

#### Moderate Duplications (Similar Logic)

**1. Service Validation** (5 instances)
- Different validation rules across creation methods
- Inconsistent error handling patterns
- Repeated service existence checks

**2. Time Management** (4 instances)
- Various approaches to time calculation
- Different availability checking algorithms
- Inconsistent time zone handling

**3. API Response Formatting** (6 instances)
- Different response structures across endpoints
- Inconsistent error response formats
- Duplicate data transformation logic

### 4. Architecture Issues

#### Service Layer Fragmentation
```
Current Structure:
Appointments/
├── services.py (re-export facade)
├── appointment_crud.py (legacy, single appointments)
├── wizard_service.py (multi-service advanced)
├── kanban_service.py (walk-in, quick creation)
├── appointment_modifications.py (updates/cancellations)
├── schedule_service.py (viewing/querying)
└── availability_service.py (time slots)
```

**Problems:**
- Business logic scattered across 6 files
- No clear separation of concerns
- Duplicate implementations of core concepts
- Difficult to maintain consistency

#### Data Model Inconsistencies
- AppointmentGroup always created, even for single appointments
- Price calculations in multiple places with different logic
- Inconsistent professional assignment patterns
- No unified approach to status management

#### Frontend API Service Duplication
- `appointmentsApi.js` (Web-admin) vs `appointmentService.js` (App-client)
- `wizardApiService.js` duplicated across platforms
- Inconsistent error handling and data transformation

## Proposed Target Architecture

### 1. Domain-Driven Design Structure

```
Backend/Modules/Appointments/
├── domain/
│   ├── entities/
│   │   ├── appointment.py           # Core appointment entity
│   │   ├── appointment_group.py     # Group aggregate root
│   │   └── professional_assignment.py
│   ├── value_objects/
│   │   ├── pricing.py              # Price calculations
│   │   ├── duration.py             # Time calculations
│   │   └── time_slot.py            # Availability slots
│   ├── services/
│   │   ├── appointment_factory.py   # Creation strategies
│   │   ├── pricing_service.py      # Unified pricing
│   │   ├── client_service.py       # Client management
│   │   └── validation_service.py   # Business rules
│   └── repositories/
│       └── appointment_repository.py # Data access
├── application/
│   ├── appointment_service.py       # Application service
│   ├── commands/                    # Command patterns
│   └── queries/                     # Query patterns
├── infrastructure/
│   └── persistence/                 # Database implementations
└── routes.py                        # Clean API layer
```

### 2. Unified Factory Pattern

```python
# Core Factory Interface
class AppointmentFactory:
    """Factory for creating different types of appointment groups"""
    
    @staticmethod
    def create_appointment_group(request: AppointmentGroupRequest) -> AppointmentGroup:
        """Unified creation method for all appointment types"""
        
        # Validate request
        validation_service.validate_appointment_request(request)
        
        # Handle client
        client = client_service.get_or_create_client(request.client_data)
        
        # Calculate pricing and duration
        pricing = pricing_service.calculate_group_pricing(request.services)
        
        # Create appointments with proper scheduling
        appointments = []
        for service_data in request.services:
            appointment = appointment_factory.create_appointment(
                client=client,
                service_data=service_data,
                group_context=request.group_context
            )
            appointments.append(appointment)
        
        # Create and return group
        return AppointmentGroup.create(
            client=client,
            appointments=appointments,
            pricing=pricing,
            metadata=request.metadata
        )
    
    @staticmethod
    def add_services_to_group(group_id: UUID, services: List[ServiceData]) -> AppointmentGroup:
        """Extend existing group with new services"""
        group = appointment_repository.get_group(group_id)
        
        # Reuse same creation logic for new services
        new_appointments = []
        for service_data in services:
            appointment = appointment_factory.create_appointment(
                client=group.client,
                service_data=service_data,
                group_context=group.context
            )
            new_appointments.append(appointment)
        
        group.add_appointments(new_appointments)
        return group
```

### 3. Unified Business Services

```python
# Pricing Service - Single Source of Truth
class PricingService:
    def calculate_service_price(
        self, 
        service: Service, 
        variation: ServiceVariation = None
    ) -> ServicePrice:
        """Calculate final price: Service Base + Variation Delta"""
        base_price = service.price
        variation_delta = variation.price_delta if variation else Decimal('0')
        return ServicePrice(
            base=base_price,
            variation_delta=variation_delta,
            final=base_price + variation_delta
        )
    
    def calculate_service_duration(
        self,
        service: Service,
        variation: ServiceVariation = None
    ) -> ServiceDuration:
        """Calculate total duration: Base + Processing + Finishing + Variation"""
        base_duration = service.duration_minutes or 0
        processing_time = service.processing_time or 0
        finishing_time = service.finishing_time or 0
        variation_delta = variation.duration_delta if variation else 0
        
        return ServiceDuration(
            base=base_duration,
            processing=processing_time,
            finishing=finishing_time,
            variation_delta=variation_delta,
            total=base_duration + processing_time + finishing_time + variation_delta
        )
    
    def calculate_group_totals(
        self, 
        services: List[ServiceWithVariation]
    ) -> GroupTotals:
        """Calculate totals for entire appointment group"""
        total_price = sum(
            self.calculate_service_price(s.service, s.variation).final 
            for s in services
        )
        total_duration = sum(
            self.calculate_service_duration(s.service, s.variation).total 
            for s in services
        )
        return GroupTotals(price=total_price, duration=total_duration)

# Client Service - Unified Client Management
class ClientService:
    def get_or_create_client(self, client_data: ClientData) -> User:
        """Unified client handling for all appointment creation flows"""
        
        # If ID provided, get existing
        if client_data.id:
            client = self.repository.get_by_id(client_data.id)
            if not client:
                raise ClientNotFoundError(f"Client {client_data.id} not found")
            return client
        
        # Search by email if provided
        if client_data.email:
            client = self.repository.get_by_email(client_data.email)
            if client:
                return client
        
        # Create new client
        return self.repository.create(
            User(
                full_name=client_data.name,
                email=client_data.email,
                phone_number=client_data.phone,
                role=UserRole.CLIENTE,
                # ... other fields
            )
        )
```

### 4. Frontend Unification Strategy

```javascript
// Unified API Service
class AppointmentApiService {
    async createAppointmentGroup(request) {
        return this.apiClient.post('/api/v1/appointments/groups', request);
    }
    
    async addServicesToGroup(groupId, services) {
        return this.apiClient.post(`/api/v1/appointments/groups/${groupId}/services`, {
            services
        });
    }
}

// Unified Creation Hook
const useAppointmentCreation = () => {
    const apiService = useAppointmentApiService();
    
    return {
        createWalkIn: (data) => apiService.createAppointmentGroup({
            type: 'walk-in',
            client: data.client,
            services: data.services,
            metadata: { immediate: true }
        }),
        
        createScheduled: (data) => apiService.createAppointmentGroup({
            type: 'scheduled',
            client: data.client,
            services: data.services,
            scheduling: data.timeSlots,
            metadata: { advance_booking: true }
        }),
        
        addServices: (groupId, services) => 
            apiService.addServicesToGroup(groupId, services)
    };
};

// Shared Calculation Utilities
export const appointmentCalculations = {
    calculateServicePrice: (service, variation) => {
        const basePrice = parseFloat(service.price) || 0;
        const variationDelta = parseFloat(variation?.price_delta) || 0;
        return basePrice + variationDelta;
    },
    
    calculateServiceDuration: (service, variation) => {
        const baseDuration = service.duration_minutes || 0;
        const processingTime = service.processing_time || 0;
        const finishingTime = service.finishing_time || 0;
        const variationDelta = variation?.duration_delta || 0;
        return baseDuration + processingTime + finishingTime + variationDelta;
    },
    
    calculateGroupTotals: (servicesWithVariations) => {
        const totalPrice = servicesWithVariations.reduce((sum, item) => {
            return sum + appointmentCalculations.calculateServicePrice(
                item.service, 
                item.variation
            ) * item.quantity;
        }, 0);
        
        const totalDuration = servicesWithVariations.reduce((sum, item) => {
            return sum + appointmentCalculations.calculateServiceDuration(
                item.service, 
                item.variation
            ) * item.quantity;
        }, 0);
        
        return { totalPrice, totalDuration };
    }
};
```

## Implementation Plan

### Phase 1: Backend Core Services (Week 1-2)

#### Week 1: Foundation
**Day 1-2: Domain Layer**
- [ ] Create domain entities (`Appointment`, `AppointmentGroup`)
- [ ] Implement value objects (`ServicePrice`, `ServiceDuration`)
- [ ] Define domain interfaces and contracts

**Day 3-4: Business Services**
- [ ] Implement `PricingService` with unified calculations
- [ ] Create `ClientService` for client management
- [ ] Build `ValidationService` for business rules

**Day 5: Factory Pattern**
- [ ] Implement `AppointmentFactory` with creation strategies
- [ ] Create command/query separation
- [ ] Add comprehensive unit tests

#### Week 2: Integration
**Day 1-3: Application Service**
- [ ] Create unified `AppointmentService` orchestrator
- [ ] Migrate walk-in creation to use new architecture
- [ ] Maintain backward compatibility with existing routes

**Day 4-5: Testing & Validation**
- [ ] Create comprehensive test suite
- [ ] Validate pricing calculations match existing logic
- [ ] Performance testing for new architecture

### Phase 2: API Consolidation (Week 3)

**Day 1-2: New Unified Endpoint**
- [ ] Create `POST /api/v1/appointments/groups` endpoint
- [ ] Support multiple creation types via request payload
- [ ] Implement proper error handling and validation

**Day 3-4: Legacy Route Migration**
- [ ] Create compatibility layer for existing endpoints
- [ ] Migrate walk-in routes to use new service internally
- [ ] Update API documentation

**Day 5: Testing**
- [ ] Integration testing for new endpoints
- [ ] Backward compatibility verification
- [ ] API contract testing

### Phase 3: Frontend Migration (Week 4-5)

#### Week 4: Shared Services
**Day 1-2: Unified API Service**
- [ ] Create shared `AppointmentApiService`
- [ ] Implement unified calculation utilities
- [ ] Create shared validation hooks

**Day 3-5: Web-admin Migration**
- [ ] Update `AddServicesModal` to use unified service
- [ ] Migrate kanban creation flow
- [ ] Update error handling and validation

#### Week 5: App-client Migration
**Day 1-3: Walk-in Modal**
- [ ] Migrate `WalkInModal` to use unified service
- [ ] Update professional assignment logic
- [ ] Standardize form validation

**Day 4-5: Scheduling Wizard**
- [ ] Update `SchedulingWizardModal` to use same backend flow
- [ ] Consolidate availability checking
- [ ] Unified error handling

### Phase 4: Legacy Cleanup & Optimization (Week 6)

**Day 1-2: Backend Cleanup**
- [ ] Remove deprecated single appointment creation
- [ ] Clean up old service methods
- [ ] Update database migrations if needed

**Day 3-4: Frontend Consolidation**
- [ ] Remove duplicate API service methods
- [ ] Consolidate validation logic
- [ ] Update component documentation

**Day 5: Final Testing**
- [ ] End-to-end testing across all platforms
- [ ] Performance optimization
- [ ] Documentation updates

## Success Metrics

### Code Quality Improvements
- **90% reduction** in duplicate appointment creation logic
- **70% reduction** in pricing/duration calculation code
- **85% reduction** in client handling duplication
- **100% consistency** in business rule application

### Maintainability Gains
- Single source of truth for all appointment business logic
- Consistent error handling across all creation methods
- Unified testing strategy
- Clear separation of concerns

### Developer Experience
- Simplified onboarding with clear architecture
- Easier feature development with established patterns
- Better debugging with centralized logic
- Improved code discoverability

### Business Benefits
- Consistent pricing calculations across all interfaces
- Unified validation rules prevent data inconsistencies
- Better error handling improves user experience
- Foundation for future appointment features

## Risk Assessment & Mitigation

### High Risk
**Risk**: Breaking existing functionality during migration
**Mitigation**: 
- Maintain backward compatibility during transition
- Comprehensive testing at each phase
- Feature flags for gradual rollout

**Risk**: Performance degradation with new architecture
**Mitigation**:
- Performance testing during development
- Database query optimization
- Caching strategies for common calculations

### Medium Risk
**Risk**: Frontend changes affecting user workflows
**Mitigation**:
- UI/UX testing with existing workflows
- Gradual migration with fallback options
- User acceptance testing

**Risk**: Complex business logic migration errors
**Mitigation**:
- Extensive unit testing
- Business logic validation with stakeholders
- Parallel testing with existing system

### Low Risk
**Risk**: Development timeline overruns
**Mitigation**:
- Detailed task breakdown
- Regular progress checkpoints
- Flexible scope adjustment

## Conclusion

This refactoring will transform the fragmented appointment creation system into a cohesive, maintainable architecture that supports the future vision of unified multi-appointment functionality. The Domain-Driven Design approach ensures clear separation of business logic, while the Factory Pattern provides flexibility for different appointment types.

The implementation plan is designed to minimize risk through gradual migration and maintaining backward compatibility. Upon completion, the system will have:

1. **Unified Business Logic**: Single source of truth for appointments
2. **Consistent User Experience**: Same behavior across all interfaces  
3. **Improved Maintainability**: Clear architecture and reduced duplication
4. **Future Flexibility**: Foundation for new appointment features
5. **Better Testing**: Centralized logic enables comprehensive testing

This specification serves as the blueprint for transforming the appointment system into a modern, maintainable, and scalable architecture.

---

**Next Steps**: Review this specification and approve implementation plan before proceeding with Phase 1 development.