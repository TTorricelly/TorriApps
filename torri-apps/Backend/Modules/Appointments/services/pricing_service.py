"""
Tenant-Aware Pricing Service for Appointments
Centralizes all price and duration calculations with proper tenant isolation.
Uses domain value objects for clean separation of concerns.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from Modules.Services.models import Service, ServiceVariation
from ..domain.value_objects import ServicePrice, ServiceDuration, ServiceCalculation, GroupTotals


class PricingService:
    """
    Tenant-aware service for price and duration calculations.
    
    Handles:
    - Service price calculation (base + variation delta)
    - Service duration calculation (base + processing + finishing + variation delta)
    - Group totals calculation for multiple services
    - Proper tenant isolation through database session
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize PricingService with tenant-aware database session.
        
        Args:
            db_session: SQLAlchemy session with tenant context from get_db()
        """
        self.db = db_session
    
    def calculate_service_price(self, service: Service, variation: Optional[ServiceVariation] = None) -> ServicePrice:
        """
        Calculate final price for a service including variation delta.
        
        Args:
            service: Service entity with base price
            variation: Optional service variation with price delta
            
        Returns:
            ServicePrice value object with breakdown
        """
        base_price = service.price or 0
        variation_delta = variation.price_delta if variation and variation.price_delta else 0
        
        return ServicePrice.create(base_price, variation_delta)
    
    def calculate_service_duration(self, service: Service, variation: Optional[ServiceVariation] = None) -> ServiceDuration:
        """
        Calculate total duration for a service including all time components.
        
        Args:
            service: Service entity with duration components
            variation: Optional service variation with duration delta
            
        Returns:
            ServiceDuration value object with breakdown
        """
        base_duration = service.duration_minutes or 0
        processing_time = service.processing_time or 0
        finishing_time = service.finishing_time or 0
        variation_delta = variation.duration_delta if variation and variation.duration_delta else 0
        
        return ServiceDuration.create(base_duration, processing_time, finishing_time, variation_delta)
    
    def calculate_service_complete(self, service: Service, variation: Optional[ServiceVariation] = None) -> ServiceCalculation:
        """
        Calculate complete pricing and duration for a service.
        
        Args:
            service: Service entity
            variation: Optional service variation
            
        Returns:
            ServiceCalculation with both price and duration
        """
        price = self.calculate_service_price(service, variation)
        duration = self.calculate_service_duration(service, variation)
        
        return ServiceCalculation(
            price=price,
            duration=duration,
            service_id=service.id,
            variation_id=variation.id if variation else None
        )
    
    def calculate_group_totals(self, service_calculations: List[ServiceCalculation]) -> GroupTotals:
        """
        Calculate totals for a group of service calculations.
        
        Args:
            service_calculations: List of individual service calculations
            
        Returns:
            GroupTotals value object
        """
        return GroupTotals.from_calculations(service_calculations)
    
    def calculate_services_from_data(self, services_data: List[dict]) -> List[ServiceCalculation]:
        """
        Calculate complete service calculations from service data.
        
        Args:
            services_data: List of service data with IDs
            
        Returns:
            List of ServiceCalculation objects
        """
        calculations = []
        
        for service_data in services_data:
            service = self.db.query(Service).filter(Service.id == service_data['id']).first()
            if not service:
                continue
                
            variation = None
            variation_id = service_data.get('service_variation_id')
            if variation_id:
                variation = self.db.query(ServiceVariation).filter(ServiceVariation.id == variation_id).first()
            
            calculation = self.calculate_service_complete(service, variation)
            calculations.append(calculation)
        
        return calculations