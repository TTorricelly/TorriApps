from typing import List, Optional, Dict, Tuple, Set
from uuid import UUID
from datetime import date, time, datetime, timedelta
from dataclasses import dataclass
from itertools import combinations, product
import hashlib

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_, or_
from fastapi import HTTPException, status

# Models
from .models import Appointment
from Modules.Services.models import Service
from Modules.Stations.models import Station, StationType, ServiceStationRequirement
from Core.Auth.models import User
from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime

# Schemas
from .schemas import (
    WizardTimeSlot, ServiceInSlot, MultiServiceAvailabilityRequest,
    MultiServiceAvailabilityResponse, ProfessionalInfo, AvailableProfessionalsResponse
)

# Constants
from .constants import AppointmentStatus
from Modules.Availability.constants import DayOfWeek, AvailabilityBlockType

# Existing availability functions
from .availability_service import get_daily_time_slots_for_professional

# Utils
from .appointment_utils import calculate_end_time


@dataclass
class ServiceRequirement:
    """Represents the requirements for a single service"""
    service: Service
    duration_minutes: int
    parallelable: bool
    max_parallel_pros: int
    station_requirements: List[ServiceStationRequirement]
    qualified_professionals: List[User]


@dataclass
class ResourceCombination:
    """Represents a combination of professionals and stations for services"""
    services: List[Service]
    professionals: List[User]  # One or more professionals
    stations: Dict[str, List[Station]]  # station_type_code -> list of stations
    execution_type: str  # "parallel" or "sequential"


class MultiServiceAvailabilityService:
    """
    Service for handling multi-service appointment availability and scheduling.
    Implements intelligent algorithms for parallel and sequential service execution.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.block_size_minutes = 30  # Standard time block size
    
    def get_available_slots(
        self,
        request: MultiServiceAvailabilityRequest
    ) -> MultiServiceAvailabilityResponse:
        """
        Main method to get available time slots for multiple services.
        
        Args:
            request: Request containing service IDs, date, and professional preferences
            
        Returns:
            Response with available time slots
        """
        # Get available time slots for multiple services
        
        # 1. Expand service requirements
        service_requirements = self._expand_service_requirements(request.service_ids)
        
        if not service_requirements:
            return MultiServiceAvailabilityResponse(
                date=request.date,
                available_slots=[]
            )
        
        # 2. Filter eligible professionals
        eligible_professionals = self._get_eligible_professionals(
            service_requirements,
            request.date,
            request.professional_ids
        )
        
        if not eligible_professionals:
            return MultiServiceAvailabilityResponse(
                date=request.date,
                available_slots=[]
            )
        
        # 3. Generate resource combinations
        resource_combinations = self._generate_resource_combinations(
            service_requirements,
            eligible_professionals,
            request.professionals_requested
        )
        
        # 4. Build itineraries for each combination
        all_itineraries = []
        for combination in resource_combinations:
            if combination.execution_type == "parallel":
                parallel_slots = self._build_parallel_itinerary(combination, request.date)
                all_itineraries.extend(parallel_slots)
            elif combination.execution_type == "sequential":
                sequential_slots = self._build_sequential_itinerary(combination, request.date)
                all_itineraries.extend(sequential_slots)
        
        # 5. Rank and filter results
        ranked_slots = self._rank_and_filter_slots(all_itineraries)
        
        
        return MultiServiceAvailabilityResponse(
            date=request.date,
            available_slots=ranked_slots[:20]  # Return top 20 options
        )
    
    def get_available_professionals(
        self,
        service_ids: List[UUID],
        target_date: date
    ) -> AvailableProfessionalsResponse:
        """
        Get professionals available for the given services on the target date.
        
        Args:
            service_ids: List of service IDs
            target_date: Date to check availability
            
        Returns:
            Response with available professionals
        """
        # Get services
        services = self.db.execute(
            select(Service)
            .options(joinedload(Service.professionals))
            .where(Service.id.in_([str(sid) for sid in service_ids]))
        ).unique().scalars().all()
        
        if not services:
            return AvailableProfessionalsResponse(
                date=target_date,
                professionals=[]
            )
        
        # Get all qualified professionals
        all_qualified_pros = set()
        for service in services:
            for professional in service.professionals:
                all_qualified_pros.add(professional)
        
        # Filter by availability on target date
        available_professionals = []
        for professional in all_qualified_pros:
            # Check if professional has any availability on target date
            availability = get_daily_time_slots_for_professional(
                self.db,
                professional.id,
                target_date
            )
            
            # If there are any available slots, include this professional
            if any(slot.is_available for slot in availability.slots):
                # Get services this professional can handle
                professional_service_ids = [
                    service.id for service in professional.services_offered
                    if service.id in service_ids
                ]
                
                available_professionals.append(ProfessionalInfo(
                    id=professional.id,
                    full_name=professional.full_name or professional.email,
                    email=professional.email,
                    photo_path=professional.photo_path,
                    services_offered=professional_service_ids
                ))
        
        return AvailableProfessionalsResponse(
            date=target_date,
            professionals=available_professionals
        )
    
    def _expand_service_requirements(
        self,
        service_ids: List[UUID]
    ) -> List[ServiceRequirement]:
        """
        Expand service IDs into detailed requirements including station needs and qualified professionals.
        
        Args:
            service_ids: List of service UUIDs
            
        Returns:
            List of service requirements
        """
        services = self.db.execute(
            select(Service)
            .options(
                joinedload(Service.professionals),
                joinedload(Service.station_requirements).joinedload(ServiceStationRequirement.station_type)
            )
            .where(Service.id.in_([str(sid) for sid in service_ids]))
        ).unique().scalars().all()
        
        requirements = []
        for service in services:
            requirements.append(ServiceRequirement(
                service=service,
                duration_minutes=service.duration_minutes,
                parallelable=service.parallelable,
                max_parallel_pros=service.max_parallel_pros,
                station_requirements=list(service.station_requirements),
                qualified_professionals=list(service.professionals)
            ))
        return requirements
    
    def _get_eligible_professionals(
        self,
        service_requirements: List[ServiceRequirement],
        target_date: date,
        specific_professional_ids: Optional[List[UUID]] = None
    ) -> List[User]:
        """
        Filter professionals who are qualified and available on the target date.
        
        Args:
            service_requirements: List of service requirements
            target_date: Target date for availability
            specific_professional_ids: Optional specific professionals to consider
            
        Returns:
            List of eligible professionals
        """
        # Get all qualified professionals across all services
        all_qualified = set()
        for req in service_requirements:
            for professional in req.qualified_professionals:
                all_qualified.add(professional)
        
        
        # Filter by specific professionals if provided
        if specific_professional_ids:
            specific_ids_str = [str(pid) for pid in specific_professional_ids]
            all_qualified = {
                prof for prof in all_qualified 
                if str(prof.id) in specific_ids_str
            }
        
        # Filter by availability on target date
        eligible_professionals = []
        for professional in all_qualified:
            availability = get_daily_time_slots_for_professional(
                self.db,
                professional.id,
                target_date
            )
            
            available_slots = [slot for slot in availability.slots if slot.is_available]
            
            # Check if professional has any available slots
            if any(slot.is_available for slot in availability.slots):
                eligible_professionals.append(professional)
        
        return eligible_professionals
    
    def _generate_resource_combinations(
        self,
        service_requirements: List[ServiceRequirement],
        eligible_professionals: List[User],
        professionals_requested: int
    ) -> List[ResourceCombination]:
        """
        Generate valid combinations of professionals and stations for the services.
        
        Args:
            service_requirements: List of service requirements
            eligible_professionals: List of available professionals
            professionals_requested: Number of professionals requested (1 or 2)
            
        Returns:
            List of valid resource combinations
        """
        resource_combinations = []
        
        # Check if parallel execution is possible
        can_parallel = self._can_execute_in_parallel(service_requirements)
        max_parallel_pros = min(req.max_parallel_pros for req in service_requirements)
        
        # Generate professional combinations
        if professionals_requested == 1 or max_parallel_pros == 1:
            # Single professional combinations
            for professional in eligible_professionals:
                if self._professional_can_handle_all_services(professional, service_requirements):
                    # Get required stations
                    station_requirements = self._get_combined_station_requirements(service_requirements)
                    available_stations = self._get_available_stations(station_requirements)
                    
                    if available_stations:
                        resource_combinations.append(ResourceCombination(
                            services=[req.service for req in service_requirements],
                            professionals=[professional],
                            stations=available_stations,
                            execution_type="sequential"
                        ))
        
        # Multi-professional sequential execution for mixed scenarios
        if professionals_requested >= 2 and max_parallel_pros == 1:
            # Sequential execution with different professionals handling different services
            for prof_pair in combinations(eligible_professionals, 2):
                if self._professional_pair_can_handle_services(prof_pair, service_requirements):
                    station_requirements = self._get_combined_station_requirements(service_requirements)
                    available_stations = self._get_available_stations(station_requirements)
                    
                    if available_stations:
                        resource_combinations.append(ResourceCombination(
                            services=[req.service for req in service_requirements],
                            professionals=list(prof_pair),
                            stations=available_stations,
                            execution_type="sequential"
                        ))
        
        if professionals_requested >= 2 and can_parallel and max_parallel_pros >= 2:
            # Two professional combinations for parallel execution
            for prof_pair in combinations(eligible_professionals, 2):
                if self._professional_pair_can_handle_services(prof_pair, service_requirements):
                    station_requirements = self._get_combined_station_requirements(service_requirements)
                    available_stations = self._get_available_stations(station_requirements)
                    
                    if available_stations:
                        resource_combinations.append(ResourceCombination(
                            services=[req.service for req in service_requirements],
                            professionals=list(prof_pair),
                            stations=available_stations,
                            execution_type="parallel"
                        ))
        
        return resource_combinations
    
    def _can_execute_in_parallel(self, service_requirements: List[ServiceRequirement]) -> bool:
        """Check if all services can be executed in parallel."""
        return all(req.parallelable for req in service_requirements)
    
    def _professional_can_handle_all_services(
        self,
        professional: User,
        service_requirements: List[ServiceRequirement]
    ) -> bool:
        """Check if a single professional can handle all services."""
        professional_service_ids = {service.id for service in professional.services_offered}
        required_service_ids = {req.service.id for req in service_requirements}
        return required_service_ids.issubset(professional_service_ids)
    
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
    
    def _get_combined_station_requirements(
        self,
        service_requirements: List[ServiceRequirement]
    ) -> Dict[str, int]:
        """
        Get combined station requirements across all services.
        
        Returns:
            Dictionary mapping station type codes to required quantities
        """
        combined_requirements = {}
        
        for req in service_requirements:
            for station_req in req.station_requirements:
                station_type_code = station_req.station_type.code
                required_qty = station_req.qty
                
                if station_type_code in combined_requirements:
                    combined_requirements[station_type_code] = max(
                        combined_requirements[station_type_code],
                        required_qty
                    )
                else:
                    combined_requirements[station_type_code] = required_qty
        
        return combined_requirements
    
    def _get_available_stations(
        self,
        station_requirements: Dict[str, int]
    ) -> Dict[str, List[Station]]:
        """
        Get available stations that meet the requirements.
        
        Args:
            station_requirements: Dictionary of station type codes to quantities needed
            
        Returns:
            Dictionary mapping station type codes to available stations
        """
        available_stations = {}
        
        for station_type_code, qty_needed in station_requirements.items():
            # Get all active stations of this type
            stations = self.db.execute(
                select(Station)
                .join(StationType)
                .where(
                    and_(
                        StationType.code == station_type_code,
                        Station.is_active == True
                    )
                )
            ).scalars().all()
            
            if len(stations) >= qty_needed:
                available_stations[station_type_code] = stations[:qty_needed]
            else:
                # Not enough stations available
                return {}
        
        return available_stations
    
    def _build_parallel_itinerary(
        self,
        combination: ResourceCombination,
        target_date: date
    ) -> List[WizardTimeSlot]:
        """
        Build parallel execution itinerary for the resource combination.
        
        Args:
            combination: Resource combination to schedule
            target_date: Target date for scheduling
            
        Returns:
            List of available time slots for parallel execution
        """
        if len(combination.professionals) < 2:
            return []
        
        # Get availability for all professionals
        professional_availabilities = {}
        for professional in combination.professionals:
            availability = get_daily_time_slots_for_professional(
                self.db,
                professional.id,
                target_date
            )
            professional_availabilities[professional.id] = availability.slots
        
        # Find simultaneous availability
        max_duration = max(service.duration_minutes for service in combination.services)
        
        simultaneous_slots = self._find_simultaneous_availability(
            professional_availabilities,
            max_duration
        )
        
        # Create wizard time slots
        wizard_slots = []
        for slot_start_time, slot_end_time in simultaneous_slots:
            # Assign services to professionals
            services_in_slot = self._assign_services_to_professionals_parallel(
                combination.services,
                combination.professionals,
                combination.stations,
                slot_start_time,
                slot_end_time
            )
            
            if services_in_slot:
                total_duration = max(service.duration_minutes for service in services_in_slot)
                total_price = sum(service.price for service in services_in_slot)
                
                # Generate unique ID for this slot
                slot_id = self._generate_slot_id(
                    target_date,
                    slot_start_time,
                    [s.service_id for s in services_in_slot],
                    "parallel"
                )
                
                wizard_slots.append(WizardTimeSlot(
                    id=slot_id,
                    start_time=slot_start_time,
                    end_time=slot_end_time,
                    total_duration_minutes=total_duration,
                    total_price=total_price,
                    execution_type="parallel",
                    services=services_in_slot
                ))
        
        return wizard_slots
    
    def _build_sequential_itinerary(
        self,
        combination: ResourceCombination,
        target_date: date
    ) -> List[WizardTimeSlot]:
        """
        Build sequential execution itinerary for the resource combination.
        
        Args:
            combination: Resource combination to schedule
            target_date: Target date for scheduling
            
        Returns:
            List of available time slots for sequential execution
        """
        # For sequential, we typically use one professional
        if not combination.professionals:
            return []
        
        primary_professional = combination.professionals[0]
        
        # Get availability for the primary professional
        availability = get_daily_time_slots_for_professional(
            self.db,
            primary_professional.id,
            target_date
        )
        
        
        # Calculate total duration needed
        total_duration = sum(service.duration_minutes for service in combination.services)
        
        # Find consecutive slots that can accommodate total duration
        consecutive_slots = self._find_consecutive_slots(
            availability.slots,
            total_duration
        )
        
        
        # Create wizard time slots
        wizard_slots = []
        for slot_start_time, slot_end_time in consecutive_slots:
            # Create sequential service assignments
            services_in_slot = self._assign_services_sequential(
                combination.services,
                primary_professional,
                combination.stations,
                slot_start_time,
                total_duration
            )
            
            if services_in_slot:
                total_price = sum(service.price for service in services_in_slot)
                
                # Generate unique ID for this slot
                slot_id = self._generate_slot_id(
                    target_date,
                    slot_start_time,
                    [s.service_id for s in services_in_slot],
                    "sequential"
                )
                
                wizard_slots.append(WizardTimeSlot(
                    id=slot_id,
                    start_time=slot_start_time,
                    end_time=slot_end_time,
                    total_duration_minutes=total_duration,
                    total_price=total_price,
                    execution_type="sequential",
                    services=services_in_slot
                ))
        
        return wizard_slots
    
    def _find_simultaneous_availability(
        self,
        professional_availabilities: Dict[str, List],
        max_duration: int
    ) -> List[Tuple[time, time]]:
        """
        Find time slots where all professionals are available simultaneously.
        
        Args:
            professional_availabilities: Dictionary mapping professional IDs to their time slots
            max_duration: Maximum duration needed for parallel services
            
        Returns:
            List of (start_time, end_time) tuples for simultaneous availability
        """
        if not professional_availabilities:
            return []
        
        # Get the intersection of all professional availabilities
        simultaneous_slots = []
        
        # Get all professionals' slots
        all_professional_slots = list(professional_availabilities.values())
        
        if not all_professional_slots:
            return []
        
        # Find common available time slots
        first_professional_slots = all_professional_slots[0]
        
        for slot in first_professional_slots:
            if not slot.is_available:
                continue
            
            # Check if this slot is available for all other professionals
            slot_available_for_all = True
            for prof_idx, other_slots in enumerate(all_professional_slots[1:], 1):
                slot_available_in_other = any(
                    other_slot.is_available and
                    other_slot.start_time <= slot.start_time and
                    other_slot.end_time >= slot.end_time
                    for other_slot in other_slots
                )
                
                if not slot_available_in_other:
                    slot_available_for_all = False
                    break
            
            if slot_available_for_all:
                # For slots that are simultaneously available, check if we can extend to meet duration
                slot_duration = self._calculate_time_difference(slot.start_time, slot.end_time)
                
                if slot_duration >= max_duration:
                    # Single slot is long enough
                    end_time = calculate_end_time(slot.start_time, max_duration)
                    simultaneous_slots.append((slot.start_time, end_time))
                else:
                    # Try to extend with consecutive slots to meet duration requirement
                    extended_end_time = self._try_extend_slot_duration(
                        slot, all_professional_slots, max_duration
                    )
                    if extended_end_time:
                        simultaneous_slots.append((slot.start_time, extended_end_time))
        
        return simultaneous_slots
    
    def _try_extend_slot_duration(self, initial_slot, all_professional_slots, required_duration):
        """
        Try to extend a slot by checking consecutive slots to meet duration requirement.
        
        Args:
            initial_slot: The starting slot that's available for all professionals
            all_professional_slots: List of slot lists for all professionals
            required_duration: Required duration in minutes
            
        Returns:
            Extended end time if possible, None otherwise
        """
        current_duration = self._calculate_time_difference(initial_slot.start_time, initial_slot.end_time)
        current_end_time = initial_slot.end_time
        
        # Check consecutive slots until we have enough duration
        while current_duration < required_duration:
            # Find the next slot for all professionals
            next_slot_available_for_all = True
            
            for prof_slots in all_professional_slots:
                # Find the slot that starts when current ends
                next_slot = None
                for slot in prof_slots:
                    if slot.start_time == current_end_time and slot.is_available:
                        next_slot = slot
                        break
                
                if not next_slot:
                    next_slot_available_for_all = False
                    break
            
            if not next_slot_available_for_all:
                # Cannot extend further
                return None
            
            # Extend the duration
            slot_duration = self._calculate_time_difference(current_end_time, next_slot.end_time)
            current_duration += slot_duration
            current_end_time = next_slot.end_time
        
        # Calculate the exact end time needed
        return calculate_end_time(initial_slot.start_time, required_duration)
    
    def _find_consecutive_slots(
        self,
        slots: List,
        total_duration: int
    ) -> List[Tuple[time, time]]:
        """
        Find consecutive time slots that can accommodate the total duration.
        
        Args:
            slots: List of time slots
            total_duration: Total duration needed in minutes
            
        Returns:
            List of (start_time, end_time) tuples for consecutive availability
        """
        consecutive_slots = []
        slots_needed = (total_duration + self.block_size_minutes - 1) // self.block_size_minutes
        
        i = 0
        while i <= len(slots) - slots_needed:
            # Check if we have enough consecutive available slots
            can_accommodate = True
            consecutive_slot_group = []
            
            for j in range(slots_needed):
                current_slot_index = i + j
                
                if current_slot_index >= len(slots):
                    can_accommodate = False
                    break
                
                current_slot = slots[current_slot_index]
                
                if not current_slot.is_available:
                    can_accommodate = False
                    break
                
                consecutive_slot_group.append(current_slot)
                
                # Verify slots are contiguous
                if j > 0:
                    previous_slot = consecutive_slot_group[j - 1]
                    if current_slot.start_time != previous_slot.end_time:
                        can_accommodate = False
                        break
            
            if can_accommodate and consecutive_slot_group:
                start_time = consecutive_slot_group[0].start_time
                end_time = calculate_end_time(start_time, total_duration)
                consecutive_slots.append((start_time, end_time))
            
            i += 1
        
        return consecutive_slots
    
    def _assign_services_to_professionals_parallel(
        self,
        services: List[Service],
        professionals: List[User],
        stations: Dict[str, List[Station]],
        start_time: time,
        end_time: time
    ) -> List[ServiceInSlot]:
        """
        Assign services to professionals for parallel execution.
        
        Args:
            services: List of services to assign
            professionals: List of available professionals
            stations: Available stations by type
            start_time: Start time for the slot
            end_time: End time for the slot
            
        Returns:
            List of service assignments
        """
        services_in_slot = []
        used_stations = set()
        used_professionals = set()
        
        for i, service in enumerate(services):
            # Assign professional - find one who can do this service and hasn't been assigned yet
            professional = None
            for prof in professionals:
                if prof.id in used_professionals:
                    continue  # Skip already assigned professionals
                    
                prof_service_ids = {s.id for s in prof.services_offered}
                if service.id in prof_service_ids:
                    professional = prof
                    used_professionals.add(prof.id)
                    break
            
            if not professional:
                # Fallback: find any available professional (even if already assigned)
                for prof in professionals:
                    prof_service_ids = {s.id for s in prof.services_offered}
                    if service.id in prof_service_ids:
                        professional = prof
                        break
                
                if not professional:
                    # Last resort: rotation
                    professional = professionals[i % len(professionals)]
            
            # Assign station
            station = None
            for station_req in service.station_requirements:
                station_type_code = station_req.station_type.code
                available_stations = stations.get(station_type_code, [])
                
                for avail_station in available_stations:
                    if avail_station.id not in used_stations:
                        station = avail_station
                        used_stations.add(avail_station.id)
                        break
                
                if station:
                    break
            
            services_in_slot.append(ServiceInSlot(
                service_id=service.id,
                service_name=service.name,
                professional_id=professional.id,
                professional_name=professional.full_name or professional.email,
                station_id=station.id if station else None,
                station_name=station.label if station else None,
                duration_minutes=service.duration_minutes,
                price=service.price
            ))
        
        return services_in_slot
    
    def _assign_services_sequential(
        self,
        services: List[Service],
        professional: User,
        stations: Dict[str, List[Station]],
        start_time: time,
        total_duration: int
    ) -> List[ServiceInSlot]:
        """
        Assign services for sequential execution.
        
        Args:
            services: List of services to assign
            professional: Professional to perform all services
            stations: Available stations by type
            start_time: Start time for the sequence
            total_duration: Total duration for all services
            
        Returns:
            List of service assignments
        """
        services_in_slot = []
        current_start_time = start_time
        
        # Optimize service order (prioritize hair services first)
        optimized_services = self._optimize_service_order(services)
        
        for service in optimized_services:
            # Assign station
            station = None
            for station_req in service.station_requirements:
                station_type_code = station_req.station_type.code
                available_stations = stations.get(station_type_code, [])
                
                if available_stations:
                    station = available_stations[0]  # Use first available station
                    break
            
            services_in_slot.append(ServiceInSlot(
                service_id=service.id,
                service_name=service.name,
                professional_id=professional.id,
                professional_name=professional.full_name or professional.email,
                station_id=station.id if station else None,
                station_name=station.label if station else None,
                duration_minutes=service.duration_minutes,
                price=service.price
            ))
            
            # Move to next service start time
            current_start_time = calculate_end_time(current_start_time, service.duration_minutes)
        
        return services_in_slot
    
    def _optimize_service_order(self, services: List[Service]) -> List[Service]:
        """
        Optimize the order of services for sequential execution.
        Prioritizes hair services before nail services.
        
        Args:
            services: List of services to order
            
        Returns:
            Optimized list of services
        """
        # Simple optimization: hair services first, then others
        hair_services = []
        other_services = []
        
        for service in services:
            # Check if service name suggests it's a hair service
            service_name_lower = service.name.lower()
            if any(term in service_name_lower for term in ['corte', 'coloração', 'escova', 'cabelo']):
                hair_services.append(service)
            else:
                other_services.append(service)
        
        return hair_services + other_services
    
    def _rank_and_filter_slots(
        self,
        itineraries: List[WizardTimeSlot]
    ) -> List[WizardTimeSlot]:
        """
        Rank itineraries by preference and filter duplicates.
        
        Args:
            itineraries: List of wizard time slots
            
        Returns:
            Ranked and filtered list of time slots
        """
        # Remove duplicates based on slot ID
        unique_slots = {}
        for slot in itineraries:
            if slot.id not in unique_slots:
                unique_slots[slot.id] = slot
        
        unique_itineraries = list(unique_slots.values())
        
        # Sort by preference criteria:
        # 1. Earlier start time
        # 2. Shorter total duration
        # 3. Parallel execution preferred over sequential
        def sort_key(slot: WizardTimeSlot):
            start_minutes = slot.start_time.hour * 60 + slot.start_time.minute
            execution_priority = 0 if slot.execution_type == "parallel" else 1
            return (start_minutes, slot.total_duration_minutes, execution_priority)
        
        return sorted(unique_itineraries, key=sort_key)
    
    def _generate_slot_id(
        self,
        date: date,
        start_time: time,
        service_ids: List[UUID],
        execution_type: str
    ) -> str:
        """
        Generate a unique ID for a time slot combination.
        
        Args:
            date: Date of the slot
            start_time: Start time of the slot
            service_ids: List of service IDs
            execution_type: Type of execution (parallel/sequential)
            
        Returns:
            Unique slot ID
        """
        # Create a string to hash
        id_string = f"{date}_{start_time}_{sorted(service_ids)}_{execution_type}"
        
        # Generate MD5 hash
        hash_object = hashlib.md5(id_string.encode())
        return hash_object.hexdigest()[:16]  # Use first 16 characters
    
    def _calculate_time_difference(self, start_time: time, end_time: time) -> int:
        """
        Calculate the difference between two times in minutes.
        
        Args:
            start_time: Start time
            end_time: End time
            
        Returns:
            Difference in minutes
        """
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute
        return end_minutes - start_minutes