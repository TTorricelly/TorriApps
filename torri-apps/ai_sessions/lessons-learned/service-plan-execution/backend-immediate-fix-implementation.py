# IMMEDIATE FIX: Backend Support for Mixed Service Scenarios
# File: Backend/Modules/Appointments/multi_service_availability_service.py

"""
This file contains the immediate fixes needed to support mixed parallelizable/sequential services.
Apply these changes to fix the current issue while the full enhancement plan is implemented.
"""

from enum import Enum
from typing import List, Optional, Dict, Tuple, Set
from dataclasses import dataclass

# =============================================================================
# IMMEDIATE FIXES - Apply These First
# =============================================================================

class ExecutionStrategy(Enum):
    """Enhanced execution strategies for mixed services"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel" 
    MIXED = "mixed"  # New: Support for mixed scenarios

@dataclass
class EnhancedResourceCombination:
    """Enhanced ResourceCombination with mixed execution support"""
    services: List[Service]
    professionals: List[User]
    stations: Dict[str, List[Station]]
    execution_type: str  # Keep for backward compatibility
    parallel_services: List[Service] = None  # New: Services that can run in parallel
    sequential_services: List[Service] = None  # New: Services that must run sequentially
    mixed_strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL  # New: Mixed execution strategy

# =============================================================================
# STEP 1: Fix the Core Parallelization Logic
# =============================================================================

def _determine_execution_strategy(
    self, 
    service_requirements: List[ServiceRequirement]
) -> ExecutionStrategy:
    """
    IMMEDIATE FIX: Determine execution strategy for mixed services.
    
    This replaces the overly strict _can_execute_in_parallel() logic.
    """
    parallel_services = [req for req in service_requirements if req.parallelable]
    sequential_services = [req for req in service_requirements if not req.parallelable]
    
    if len(sequential_services) == 0:
        return ExecutionStrategy.PARALLEL
    elif len(parallel_services) == 0:
        return ExecutionStrategy.SEQUENTIAL
    else:
        return ExecutionStrategy.MIXED  # This is the key fix!

def _can_execute_in_parallel_enhanced(
    self, 
    service_requirements: List[ServiceRequirement]
) -> bool:
    """
    IMMEDIATE FIX: Replace the strict parallelization check.
    
    Now returns True if ANY services can be parallelized, enabling mixed scenarios.
    """
    strategy = self._determine_execution_strategy(service_requirements)
    return strategy in [ExecutionStrategy.PARALLEL, ExecutionStrategy.MIXED]

# =============================================================================
# STEP 2: Enhanced Resource Combination Generation  
# =============================================================================

def _generate_resource_combinations_enhanced(
    self,
    service_requirements: List[ServiceRequirement],
    eligible_professionals: List[User], 
    professionals_requested: int
) -> List[ResourceCombination]:
    """
    IMMEDIATE FIX: Generate combinations that support mixed execution.
    
    This is a minimally invasive change to the existing logic.
    """
    resource_combinations = []
    
    # Determine execution strategy
    execution_strategy = self._determine_execution_strategy(service_requirements)
    
    # Separate services by parallelization capability
    parallel_services = [req for req in service_requirements if req.parallelable]
    sequential_services = [req for req in service_requirements if not req.parallelable]
    
    # Calculate constraints
    if execution_strategy == ExecutionStrategy.MIXED:
        # For mixed scenarios, use minimum constraint of parallel services only
        parallel_constraints = [req.max_parallel_pros for req in parallel_services] 
        max_parallel_pros = min(parallel_constraints) if parallel_constraints else 1
    else:
        # Existing logic for pure scenarios
        max_parallel_pros = min(req.max_parallel_pros for req in service_requirements)
    
    # Generate professional combinations based on strategy
    if professionals_requested == 1 or max_parallel_pros == 1:
        # Single professional combinations (existing logic)
        resource_combinations.extend(
            self._generate_single_professional_combinations(
                service_requirements, eligible_professionals, execution_strategy
            )
        )
    else:
        # Multi-professional combinations with mixed support
        resource_combinations.extend(
            self._generate_multi_professional_combinations(
                service_requirements, eligible_professionals, 
                professionals_requested, execution_strategy,
                parallel_services, sequential_services
            )
        )
    
    return resource_combinations

def _generate_multi_professional_combinations(
    self,
    service_requirements: List[ServiceRequirement],
    eligible_professionals: List[User],
    professionals_requested: int,
    execution_strategy: ExecutionStrategy,
    parallel_services: List[ServiceRequirement],
    sequential_services: List[ServiceRequirement]
) -> List[ResourceCombination]:
    """
    IMMEDIATE FIX: Generate multi-professional combinations with mixed support.
    """
    combinations = []
    
    # Try different combinations of professionals
    from itertools import combinations as itertools_combinations
    
    for prof_combination in itertools_combinations(eligible_professionals, professionals_requested):
        # Validate this combination can handle all services
        if self._professionals_can_handle_all_services(prof_combination, service_requirements):
            
            # Get required stations
            station_requirements = self._get_combined_station_requirements(service_requirements)
            available_stations = self._get_available_stations(station_requirements)
            
            if available_stations:
                # Determine execution type for this combination
                if execution_strategy == ExecutionStrategy.MIXED:
                    execution_type = "mixed"
                elif execution_strategy == ExecutionStrategy.PARALLEL:
                    execution_type = "parallel"
                else:
                    execution_type = "sequential"
                
                # Create enhanced resource combination
                combination = EnhancedResourceCombination(
                    services=[req.service for req in service_requirements],
                    professionals=list(prof_combination),
                    stations=available_stations,
                    execution_type=execution_type,
                    parallel_services=[req.service for req in parallel_services],
                    sequential_services=[req.service for req in sequential_services],
                    mixed_strategy=execution_strategy
                )
                combinations.append(combination)
    
    return combinations

# =============================================================================
# STEP 3: Mixed Itinerary Building (Immediate Implementation)
# =============================================================================

def _build_mixed_itinerary_simple(
    self, 
    combination: EnhancedResourceCombination, 
    target_date: date
) -> List[WizardTimeSlot]:
    """
    IMMEDIATE FIX: Simple mixed itinerary building.
    
    This provides a basic but functional mixed execution implementation.
    Strategy: Run all services sequentially but optimize professional assignments.
    """
    
    # For immediate fix, we'll use a simplified approach:
    # 1. Run parallel services first (if any) with optimal professional assignment
    # 2. Run sequential services after, using available professionals
    
    all_services = combination.parallel_services + combination.sequential_services
    all_slots = []
    
    # Use the existing sequential itinerary logic but with smart professional assignment
    sequential_slots = self._build_sequential_itinerary_with_smart_assignment(
        combination, target_date, all_services
    )
    
    return sequential_slots

def _build_sequential_itinerary_with_smart_assignment(
    self,
    combination: EnhancedResourceCombination,
    target_date: date,
    services: List[Service]
) -> List[WizardTimeSlot]:
    """
    IMMEDIATE FIX: Enhanced sequential building with smart professional assignment.
    
    Uses the existing sequential logic but with better professional distribution.
    """
    
    # Get availability for all professionals
    professional_availabilities = {}
    for professional in combination.professionals:
        availability = get_daily_time_slots_for_professional(
            self.db, professional.id, target_date
        )
        professional_availabilities[professional.id] = availability
    
    # Find common available time slots
    common_slots = self._find_common_available_slots(professional_availabilities)
    
    # Calculate total duration needed
    total_duration = sum(service.duration_minutes for service in services)
    
    wizard_slots = []
    for slot_start_time in common_slots:
        slot_end_time = (
            datetime.combine(target_date, slot_start_time) + 
            timedelta(minutes=total_duration)
        ).time()
        
        # Check if this time slot works for all professionals
        if self._validate_time_slot_for_professionals(
            combination.professionals, target_date, slot_start_time, slot_end_time
        ):
            
            # Use smart assignment to distribute services optimally
            services_in_slot = self._assign_services_with_smart_distribution(
                services, combination.professionals, combination.stations, 
                slot_start_time, target_date, combination.parallel_services
            )
            
            if services_in_slot:
                total_price = sum(service.price for service in services_in_slot)
                
                # Generate unique slot ID
                slot_id = self._generate_slot_id(
                    services_in_slot, target_date, slot_start_time, "mixed"
                )
                
                wizard_slot = WizardTimeSlot(
                    id=slot_id,
                    start_time=slot_start_time,
                    end_time=slot_end_time,
                    total_duration=total_duration,
                    total_price=total_price,
                    execution_type="mixed",  # New execution type
                    services=services_in_slot
                )
                wizard_slots.append(wizard_slot)
    
    return wizard_slots

def _assign_services_with_smart_distribution(
    self,
    services: List[Service],
    professionals: List[User],
    stations: Dict[str, List[Station]],
    start_time: time,
    target_date: date,
    parallel_services: List[Service]
) -> List[ServiceInSlot]:
    """
    IMMEDIATE FIX: Smart service distribution for mixed scenarios.
    
    Prioritizes parallel services for simultaneous execution when possible.
    """
    
    # Use the existing smart assignment but consider parallel preferences
    parallel_service_ids = {service.id for service in parallel_services}
    
    # Get optimal professional assignments
    assignments = self._smart_professional_assignment(services, professionals)
    
    services_in_slot = []
    used_stations = set()
    current_time = start_time
    
    # Group assignments by parallel capability
    parallel_assignments = [(s, p) for s, p in assignments if s.id in parallel_service_ids]
    sequential_assignments = [(s, p) for s, p in assignments if s.id not in parallel_service_ids]
    
    # Process parallel services first (they can run simultaneously)
    parallel_duration = 0
    if parallel_assignments:
        parallel_duration = max(service.duration_minutes for service, _ in parallel_assignments)
        
        for service, professional in parallel_assignments:
            station = self._assign_station_for_service(service, stations, used_stations)
            if station:
                service_start_time = current_time
                service_end_time = (
                    datetime.combine(target_date, current_time) + 
                    timedelta(minutes=service.duration_minutes)
                ).time()
                
                service_slot = ServiceInSlot(
                    service_id=service.id,
                    service_name=service.name,
                    duration_minutes=service.duration_minutes,
                    price=service.price,
                    start_time=service_start_time,
                    end_time=service_end_time,
                    professional_id=professional.id,
                    professional_name=professional.full_name or professional.email,
                    station_id=station.id if station else None,
                    station_name=station.name if station else None
                )
                services_in_slot.append(service_slot)
    
    # Update current time after parallel services
    if parallel_duration > 0:
        current_time = (
            datetime.combine(target_date, current_time) + 
            timedelta(minutes=parallel_duration)
        ).time()
    
    # Process sequential services
    for service, professional in sequential_assignments:
        station = self._assign_station_for_service(service, stations, used_stations)
        if station:
            service_start_time = current_time
            service_end_time = (
                datetime.combine(target_date, current_time) + 
                timedelta(minutes=service.duration_minutes)
            ).time()
            
            service_slot = ServiceInSlot(
                service_id=service.id,
                service_name=service.name,
                duration_minutes=service.duration_minutes,
                price=service.price,
                start_time=service_start_time,
                end_time=service_end_time,
                professional_id=professional.id,
                professional_name=professional.full_name or professional.email,
                station_id=station.id if station else None,
                station_name=station.name if station else None
            )
            services_in_slot.append(service_slot)
            
            # Update current time for next sequential service
            current_time = service_end_time
    
    return services_in_slot

# =============================================================================
# STEP 4: Integration with Existing Logic
# =============================================================================

def get_multi_service_availability_enhanced(
    self, 
    request: MultiServiceAvailabilityRequest
) -> MultiServiceAvailabilityResponse:
    """
    IMMEDIATE FIX: Enhanced main availability method.
    
    Minimal changes to integrate mixed service support.
    """
    
    # ... existing code for steps 1-2 (get services, build requirements) ...
    
    # CHANGE: Use enhanced resource combination generation
    resource_combinations = self._generate_resource_combinations_enhanced(
        service_requirements,
        eligible_professionals, 
        request.professionals_requested
    )
    
    # CHANGE: Enhanced itinerary building
    all_itineraries = []
    for combination in resource_combinations:
        if hasattr(combination, 'execution_type'):
            if combination.execution_type == "parallel":
                slots = self._build_parallel_itinerary(combination, request.date)
            elif combination.execution_type == "sequential":
                slots = self._build_sequential_itinerary(combination, request.date)
            elif combination.execution_type == "mixed":  # NEW
                slots = self._build_mixed_itinerary_simple(combination, request.date)
            else:
                continue  # Skip unknown execution types
                
            all_itineraries.extend(slots)
    
    # ... existing code for ranking and filtering ...
    
    return MultiServiceAvailabilityResponse(
        date=request.date,
        available_slots=ranked_slots[:20]
    )

# =============================================================================
# USAGE INSTRUCTIONS
# =============================================================================

"""
To implement this immediate fix:

1. Add the ExecutionStrategy enum to the top of the file
2. Replace _can_execute_in_parallel() with _can_execute_in_parallel_enhanced()
3. Replace _generate_resource_combinations() with _generate_resource_combinations_enhanced()
4. Add the mixed itinerary building methods
5. Update the main get_multi_service_availability() method

This will immediately enable support for mixed parallelizable/sequential services
while maintaining backward compatibility with existing functionality.

Test with your scenario:
- 4 services (2 parallel, 2 sequential)
- 2 professionals
- Should now return available time slots with "mixed" execution type
"""