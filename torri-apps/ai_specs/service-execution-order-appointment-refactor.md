# Service Execution Order - Appointment Booking Integration Specification

## Overview
This specification outlines how to integrate the new service execution order and compatibility matrix with the existing appointment booking logic in the multi-service availability system.

## Current State Analysis

### Existing Appointment Booking Flow
**Location**: `Backend/Modules/Appointments/multi_service_availability_service.py`

**Current Logic**:
1. `MultiServiceAvailabilityService` handles multi-service appointments
2. Uses basic keyword-based ordering (`_optimize_service_order`)
3. Supports parallel, sequential, and mixed execution types
4. Creates `AppointmentGroup` + individual `Appointment` records

**Current Service Ordering**:
```python
def _optimize_service_order(self, services: List[Service]) -> List[Service]:
    """Prioritizes hair services before nail services using keywords"""
    hair_services = []
    other_services = []
    
    for service in services:
        service_name_lower = service.name.lower()
        if any(term in service_name_lower for term in ['corte', 'coloração', 'escova', 'cabelo']):
            hair_services.append(service)
        else:
            other_services.append(service)
    
    return hair_services + other_services
```

## Integration Plan

### Phase 1: Database-Driven Service Ordering

#### 1.1 Update Service Ordering Logic
**File**: `Backend/Modules/Appointments/multi_service_availability_service.py`

Replace keyword-based ordering with database-driven execution order:

```python
def _optimize_service_order(self, services: List[Service]) -> List[Service]:
    """
    Order services based on database-configured execution_order.
    Handles both strict and flexible services.
    """
    # Separate strict and flexible services
    strict_services = [s for s in services if not s.execution_flexible]
    flexible_services = [s for s in services if s.execution_flexible]
    
    # Sort strict services by execution_order
    strict_services.sort(key=lambda s: s.execution_order)
    
    # For now, append flexible services at the end
    # TODO: Implement intelligent flexible service insertion
    return strict_services + flexible_services
```

#### 1.2 Enhanced Service Model Loading
Ensure service queries include new fields:

```python
# In service queries, ensure we load the new fields
services = db.query(Service).options(
    selectinload(Service.category)
).filter(
    Service.id.in_(service_ids)
).order_by(Service.execution_order).all()
```

### Phase 2: Compatibility Matrix Integration

#### 2.1 Service Compatibility Validation
**New Function**: Validate service combinations before booking

```python
def validate_service_compatibility(self, services: List[Service], db: Session) -> Dict:
    """
    Validate that selected services can run together based on compatibility matrix.
    Returns compatibility analysis and recommendations.
    """
    incompatible_pairs = []
    processing_only_pairs = []
    
    for i, service_a in enumerate(services):
        for service_b in services[i+1:]:
            compatibility = self._get_service_compatibility(service_a.id, service_b.id, db)
            
            if compatibility.parallel_type == 'never':
                incompatible_pairs.append((service_a, service_b, compatibility.reason))
            elif compatibility.parallel_type == 'during_processing_only':
                processing_only_pairs.append((service_a, service_b))
    
    return {
        'is_valid': len(incompatible_pairs) == 0,
        'incompatible_pairs': incompatible_pairs,
        'processing_only_pairs': processing_only_pairs,
        'recommendations': self._generate_compatibility_recommendations(services, db)
    }
```

#### 2.2 Parallel Execution Rules
Update parallel execution logic to use compatibility matrix:

```python
def _can_services_run_parallel(self, service_a: Service, service_b: Service, db: Session) -> str:
    """
    Check if two services can run in parallel based on compatibility matrix.
    Returns: 'full_parallel', 'during_processing_only', 'never'
    """
    compatibility = db.query(ServiceCompatibility).filter(
        or_(
            and_(ServiceCompatibility.service_a_id == service_a.id, 
                 ServiceCompatibility.service_b_id == service_b.id),
            and_(ServiceCompatibility.service_a_id == service_b.id, 
                 ServiceCompatibility.service_b_id == service_a.id)
        )
    ).first()
    
    if compatibility:
        return compatibility.parallel_type
    
    # Default behavior for undefined compatibility
    return 'never'  # Conservative default
```

### Phase 3: Advanced Timing Integration

#### 3.1 Processing Time Optimization
Integrate processing time fields for intelligent scheduling:

```python
def _calculate_service_timeline(self, service: Service) -> Dict:
    """
    Calculate detailed service timeline including processing time.
    """
    active_time = service.duration_minutes
    
    if service.processing_time:
        active_time = service.duration_minutes - (service.processing_time + (service.finishing_time or 0))
    
    return {
        'total_duration': service.duration_minutes,
        'active_time': active_time,
        'processing_time': service.processing_time or 0,
        'finishing_time': service.finishing_time or 0,
        'transition_time': service.transition_time or 0,
        'professional_free_during_processing': service.processing_time > 0
    }
```

#### 3.2 Flexible Service Insertion
Implement intelligent insertion of flexible services:

```python
def _insert_flexible_services(self, strict_services: List[Service], flexible_services: List[Service], db: Session) -> List[Service]:
    """
    Intelligently insert flexible services into the timeline.
    Takes advantage of processing times and parallel compatibility.
    """
    result = []
    
    for i, strict_service in enumerate(strict_services):
        result.append(strict_service)
        
        # Check if we can insert flexible services during/after this service
        timeline = self._calculate_service_timeline(strict_service)
        
        if timeline['professional_free_during_processing']:
            # Find flexible services that can run during processing
            compatible_flexible = [
                fs for fs in flexible_services 
                if fs.can_be_done_during_processing and 
                   self._can_services_run_parallel(strict_service, fs, db) in ['full_parallel', 'during_processing_only']
            ]
            
            # Insert compatible flexible services
            result.extend(compatible_flexible)
            # Remove inserted services from flexible list
            flexible_services = [fs for fs in flexible_services if fs not in compatible_flexible]
    
    # Append remaining flexible services
    result.extend(flexible_services)
    
    return result
```

### Phase 4: API Endpoint Updates

#### 4.1 Multi-Service Booking Request Schema
Update booking request to accept execution preferences:

```python
class MultiServiceBookingRequest(BaseModel):
    services: List[UUID]
    execution_type: ExecutionType = ExecutionType.AUTO  # AUTO, PARALLEL, SEQUENTIAL
    respect_execution_order: bool = True
    allow_flexible_optimization: bool = True
    preferred_start_time: Optional[datetime] = None
    # ... existing fields
```

#### 4.2 Booking Validation Endpoint
Add endpoint for pre-booking validation:

```python
@router.post("/validate-service-combination")
def validate_service_combination(
    request: ServiceCompatibilityRequest,
    db: Session = Depends(get_db)
):
    """
    Validate service combination compatibility before booking.
    Returns compatibility analysis and optimization suggestions.
    """
    service_ids = request.service_ids
    services = db.query(Service).filter(Service.id.in_(service_ids)).all()
    
    availability_service = MultiServiceAvailabilityService()
    validation_result = availability_service.validate_service_compatibility(services, db)
    
    return {
        "is_valid": validation_result['is_valid'],
        "compatibility_analysis": validation_result,
        "suggested_order": [s.id for s in availability_service._optimize_service_order(services)],
        "estimated_duration": availability_service._calculate_total_duration(services),
        "execution_options": availability_service._get_execution_options(services, db)
    }
```

## Migration Strategy

### Step 1: Backward Compatibility
- Keep existing keyword-based ordering as fallback
- Gradually migrate to database-driven ordering
- Add feature flags for new behavior

### Step 2: Phased Rollout
1. **Phase 1**: Database schema + basic execution order
2. **Phase 2**: Compatibility matrix validation
3. **Phase 3**: Advanced timing and flexible service optimization
4. **Phase 4**: Full integration with booking UI

### Step 3: Testing Strategy
- Unit tests for compatibility validation
- Integration tests for booking flow
- Load testing with complex service combinations
- A/B testing with existing vs new ordering logic

## Configuration Examples

### Hair Salon Service Configuration
```json
{
  "hair_cut": {
    "execution_order": 1,
    "execution_flexible": false,
    "duration_minutes": 45,
    "transition_time": 3
  },
  "hair_coloring": {
    "execution_order": 2,
    "execution_flexible": false,
    "duration_minutes": 60,
    "processing_time": 30,
    "finishing_time": 15,
    "allows_parallel_during_processing": true
  },
  "manicure": {
    "execution_order": 999,
    "execution_flexible": true,
    "duration_minutes": 30,
    "can_be_done_during_processing": true
  }
}
```

### Compatibility Matrix Example
```json
{
  "hair_cut_coloring": {
    "parallel_type": "never",
    "reason": "same_professional"
  },
  "coloring_manicure": {
    "parallel_type": "during_processing_only",
    "reason": "different_body_areas"
  }
}
```

## Performance Considerations

### Database Optimization
- Index on `execution_order` and `execution_flexible`
- Efficient compatibility matrix queries
- Caching for frequently accessed compatibility rules

### Algorithm Optimization
- Memoization for service ordering calculations
- Batch compatibility lookups
- Parallel processing for availability calculations

## Future Enhancements

### Advanced Features
1. **Dynamic Execution Order**: AI-driven optimization based on professional availability
2. **Resource Dependencies**: Station and equipment constraints
3. **Client Preferences**: Personal service order preferences
4. **Seasonal Adjustments**: Time-based execution order modifications

### Integration Points
1. **Professional Scheduling**: Integration with professional availability
2. **Inventory Management**: Service resource requirements
3. **Client Communication**: Automatic timeline sharing
4. **Analytics**: Service combination performance tracking

This specification provides a comprehensive roadmap for integrating the service execution order and compatibility matrix with the existing appointment booking system while maintaining backward compatibility and enabling future enhancements.