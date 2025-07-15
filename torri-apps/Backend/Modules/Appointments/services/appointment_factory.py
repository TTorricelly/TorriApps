"""
Tenant-Aware Appointment Factory Service
Orchestrates the complete appointment creation workflow using ClientService and PricingService.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import pytz
from uuid import uuid4

from ..domain.value_objects import (
    AppointmentData, ClientData, ServiceCalculation, GroupTotals, ClientResult
)
from .client_service import ClientService
from .pricing_service import PricingService
from ..models import AppointmentGroup, Appointment
from ..constants import AppointmentGroupStatus, AppointmentStatus
from Modules.Services.models import Service, ServiceVariation


class AppointmentFactory:
    """
    Tenant-aware factory for creating complete appointment workflows.
    
    Orchestrates:
    - Client creation/lookup via ClientService
    - Service pricing calculations via PricingService  
    - AppointmentGroup creation with timing calculations
    - Individual Appointment creation with professional assignments
    - Proper tenant isolation through database session
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize AppointmentFactory with tenant-aware database session.
        
        Args:
            db_session: SQLAlchemy session with tenant context from get_db()
        """
        self.db = db_session
        self.client_service = ClientService(db_session)
        self.pricing_service = PricingService(db_session)
        
        # Brazil timezone for appointment scheduling
        self.brazil_tz = pytz.timezone('America/Sao_Paulo')
    
    def create_walk_in_appointment_group(
        self,
        client_data: Dict[str, Any],
        services_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a complete walk-in appointment group with all associated appointments.
        Includes proper error handling and transaction management.
        
        Args:
            client_data: Dictionary containing client information
            services_data: List of service dictionaries with professional assignments
            
        Returns:
            Dictionary with created appointment group and appointments data
            
        Raises:
            ValueError: If validation fails or required data is missing
        """
        try:
            # Step 1: Pre-validate request before any database operations
            self.validate_appointment_request(client_data, services_data)
            
            # Step 2: Prepare appointment data (includes client resolution)
            appointment_data = self._prepare_appointment_data(client_data, services_data)
            
            # Step 3: Create appointment group entity
            appointment_group = self._create_appointment_group(appointment_data)
            
            # Step 4: Create individual appointments
            appointments = self._create_individual_appointments(appointment_group, appointment_data)
            
            # Step 5: Commit transaction
            self.db.commit()
            
            # Step 6: Return complete appointment data with services info
            services_map = self._load_services_batch(services_data)
            return self._format_appointment_response(appointment_group, appointments, appointment_data, services_map)
            
        except ValueError:
            # Re-raise validation errors without rollback (no changes made yet)
            raise
        except Exception as e:
            # Rollback on any unexpected errors
            self.db.rollback()
            raise ValueError(f"Failed to create appointment group: {str(e)}") from e
    
    def _prepare_appointment_data(
        self,
        client_data: Dict[str, Any],
        services_data: List[Dict[str, Any]]
    ) -> AppointmentData:
        """
        Prepare and validate all appointment data using domain services.
        Single point for client resolution and service loading with batch optimization.
        
        Args:
            client_data: Raw client data dictionary
            services_data: Raw services data list
            
        Returns:
            Validated AppointmentData value object with resolved client
            
        Raises:
            ValueError: If validation fails
        """
        # Step 1: Process client data once (eliminate redundant calls)
        client_result = self.client_service.get_or_create_client(client_data)
        
        # Step 2: Batch load services for efficiency
        services_map = self._load_services_batch(services_data)
        variations_map = self._load_variations_batch(services_data)
        
        # Step 3: Process services and calculate pricing
        service_calculations = []
        professional_assignments = {}
        
        for service_data in services_data:
            service_id = service_data['id']
            service = services_map.get(service_id)
            if not service:
                continue  # Skip invalid services
            
            # Get variation if specified
            variation = None
            variation_id = service_data.get('service_variation_id')
            if variation_id:
                variation = variations_map.get(variation_id)
            
            # Calculate pricing and duration using pricing service
            calculation = self.pricing_service.calculate_service_complete(service, variation)
            service_calculations.append(calculation)
            
            # Store professional assignment with validation
            professional_id = service_data.get('professional_id')
            if not professional_id:
                raise ValueError(f"Professional ID required for service {service.name}")
            professional_assignments[service.id] = professional_id
        
        if not service_calculations:
            raise ValueError("No valid services provided")
        
        # Step 4: Create appointment data value object with client result
        return AppointmentData.create(
            client_result=client_result,
            service_calculations=service_calculations,
            professional_assignments=professional_assignments
        )
    
    def _create_appointment_group(self, appointment_data: AppointmentData) -> AppointmentGroup:
        """
        Create AppointmentGroup entity with calculated timing and totals.
        Uses pre-resolved client from appointment_data to avoid redundant calls.
        
        Args:
            appointment_data: Validated appointment data with resolved client
            
        Returns:
            Created AppointmentGroup entity (not yet committed)
        """
        # Calculate timing using Brazil timezone
        now = datetime.now(self.brazil_tz).replace(tzinfo=None)
        start_time = now.replace(second=0, microsecond=0)
        
        total_duration = appointment_data.group_totals.total_duration
        end_time = start_time + timedelta(minutes=total_duration)
        
        # Use pre-resolved client (no redundant service call)
        client = appointment_data.client_result.client
        
        # Create appointment group
        appointment_group = AppointmentGroup(
            client_id=client.id,
            total_duration_minutes=total_duration,
            total_price=appointment_data.group_totals.total_price,
            start_time=start_time,
            end_time=end_time,
            status=AppointmentGroupStatus.WALK_IN,
            created_at=now,
            updated_at=now
        )
        
        self.db.add(appointment_group)
        self.db.flush()  # Get the group ID
        
        return appointment_group
    
    def _create_individual_appointments(
        self,
        appointment_group: AppointmentGroup,
        appointment_data: AppointmentData
    ) -> List[Appointment]:
        """
        Create individual appointments for each service with professional assignments.
        Uses pre-resolved client from appointment_data to avoid redundant calls.
        
        Args:
            appointment_group: Created appointment group
            appointment_data: Appointment data with resolved client and calculations
            
        Returns:
            List of created Appointment entities (not yet committed)
        """
        appointments = []
        current_time = appointment_group.start_time
        now = datetime.now(self.brazil_tz).replace(tzinfo=None)
        
        # Use pre-resolved client (no redundant service call)
        client = appointment_data.client_result.client
        
        for calculation in appointment_data.service_calculations:
            # Calculate appointment timing
            appointment_end = current_time + timedelta(minutes=calculation.duration.total)
            
            # Get professional assignment
            professional_id = appointment_data.professional_assignments[calculation.service_id]
            
            # Create appointment
            appointment = Appointment(
                client_id=client.id,
                professional_id=professional_id,
                service_id=calculation.service_id,
                service_variation_id=calculation.variation_id,
                group_id=appointment_group.id,
                appointment_date=current_time.date(),
                start_time=current_time.time(),
                end_time=appointment_end.time(),
                status=AppointmentStatus.WALK_IN,
                price_at_booking=calculation.price.final,
                created_at=now,
                updated_at=now
            )
            
            self.db.add(appointment)
            appointments.append(appointment)
            
            # Move to next appointment start time
            current_time = appointment_end
        
        return appointments
    
    def _format_appointment_response(
        self,
        appointment_group: AppointmentGroup,
        appointments: List[Appointment],
        appointment_data: AppointmentData,
        services_map: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Format the complete appointment creation response.
        Include client data to eliminate redundant queries.
        
        Args:
            appointment_group: Created appointment group
            appointments: Created appointments
            appointment_data: Original appointment data
            
        Returns:
            Formatted response dictionary with embedded client data
        """
        # Get client information from resolved client result
        client = appointment_data.client_result.client
        
        # Build services info from batch-loaded services
        services_info = {}
        if services_map:
            for service_id, service in services_map.items():
                services_info[service_id] = {
                    'id': service_id,
                    'name': service.name
                }
        
        return {
            'appointment_group': {
                'id': appointment_group.id,
                'client_id': appointment_group.client_id,
                'total_duration_minutes': appointment_group.total_duration_minutes,
                'total_price': float(appointment_group.total_price),
                'start_time': appointment_group.start_time.isoformat(),
                'end_time': appointment_group.end_time.isoformat(),
                'status': appointment_group.status.value,
                'created_at': appointment_group.created_at.isoformat(),
            },
            'appointments': [
                {
                    'id': appointment.id,
                    'professional_id': appointment.professional_id,
                    'service_id': appointment.service_id,
                    'service_variation_id': appointment.service_variation_id,
                    'appointment_date': appointment.appointment_date.isoformat(),
                    'start_time': appointment.start_time.isoformat(),
                    'end_time': appointment.end_time.isoformat(),
                    'status': appointment.status.value,
                    'price_at_booking': float(appointment.price_at_booking),
                }
                for appointment in appointments
            ],
            'totals': {
                'total_price': float(appointment_data.group_totals.total_price),
                'total_duration': appointment_data.group_totals.total_duration,
                'service_count': appointment_data.group_totals.service_count,
            },
            'client_info': {
                'id': str(client.id),
                'full_name': client.full_name,
                'nickname': client.nickname,
                'email': client.email,
                'phone': client.phone,
                'notes_by_client': getattr(client, 'notes_by_client', None)
            },
            'services_info': services_info,
            'client_was_created': appointment_data.client_result.was_created
        }
    
    def validate_appointment_request(
        self,
        client_data: Dict[str, Any],
        services_data: List[Dict[str, Any]]
    ) -> None:
        """
        Validate appointment request data before processing.
        
        Args:
            client_data: Client data dictionary
            services_data: Services data list
            
        Raises:
            ValueError: If validation fails
        """
        # Validate client data
        self.client_service.validate_client_data(client_data)
        
        # Validate services data
        if not services_data:
            raise ValueError("At least one service must be provided")
        
        for service_data in services_data:
            if not service_data.get('id'):
                raise ValueError("Service ID is required for each service")
            
            if not service_data.get('professional_id'):
                raise ValueError("Professional ID is required for each service")
        
        # Validate services exist in database
        for service_data in services_data:
            service = self.db.query(Service).filter(Service.id == service_data['id']).first()
            if not service:
                raise ValueError(f"Service with ID {service_data['id']} not found")
            
            # Validate variation if specified
            variation_id = service_data.get('service_variation_id')
            if variation_id:
                variation = self.db.query(ServiceVariation).filter(
                    ServiceVariation.id == variation_id
                ).first()
                if not variation:
                    raise ValueError(f"Service variation with ID {variation_id} not found")
    
    def _load_services_batch(self, services_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Batch load all services for efficiency.
        
        Args:
            services_data: List of service data dictionaries
            
        Returns:
            Dictionary mapping service_id -> Service entity
        """
        service_ids = [service_data['id'] for service_data in services_data]
        if not service_ids:
            return {}
            
        services = self.db.query(Service).filter(Service.id.in_(service_ids)).all()
        return {str(service.id): service for service in services}
    
    def _load_variations_batch(self, services_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Batch load all service variations for efficiency.
        
        Args:
            services_data: List of service data dictionaries
            
        Returns:
            Dictionary mapping variation_id -> ServiceVariation entity
        """
        variation_ids = [
            service_data['service_variation_id'] 
            for service_data in services_data 
            if service_data.get('service_variation_id')
        ]
        
        if not variation_ids:
            return {}
            
        variations = self.db.query(ServiceVariation).filter(
            ServiceVariation.id.in_(variation_ids)
        ).all()
        return {str(variation.id): variation for variation in variations}