"""
Comprehensive unit tests for PricingService
Tests all pricing and duration calculations with and without variations.
"""
import pytest
from decimal import Decimal
from unittest.mock import Mock, MagicMock
from uuid import uuid4

from Modules.Appointments.services.pricing_service import PricingService
from Modules.Appointments.domain.value_objects import (
    ServicePrice, ServiceDuration, ServiceCalculation, GroupTotals
)
from Modules.Services.models import Service, ServiceVariation


class TestServicePrice:
    """Test ServicePrice value object"""
    
    def test_create_without_variation(self):
        price = ServicePrice.create(Decimal('50.00'))
        
        assert price.base == Decimal('50.00')
        assert price.variation_delta == Decimal('0')
        assert price.final == Decimal('50.00')
    
    def test_create_with_positive_variation(self):
        price = ServicePrice.create(Decimal('50.00'), Decimal('15.00'))
        
        assert price.base == Decimal('50.00')
        assert price.variation_delta == Decimal('15.00')
        assert price.final == Decimal('65.00')
    
    def test_create_with_negative_variation(self):
        price = ServicePrice.create(Decimal('50.00'), Decimal('-10.00'))
        
        assert price.base == Decimal('50.00')
        assert price.variation_delta == Decimal('-10.00')
        assert price.final == Decimal('40.00')


class TestServiceDuration:
    """Test ServiceDuration value object"""
    
    def test_create_basic_duration(self):
        duration = ServiceDuration.create(base=60)
        
        assert duration.base == 60
        assert duration.processing == 0
        assert duration.finishing == 0
        assert duration.variation_delta == 0
        assert duration.total == 60
    
    def test_create_complete_duration(self):
        duration = ServiceDuration.create(
            base=60,
            processing=15,
            finishing=10,
            variation_delta=30
        )
        
        assert duration.base == 60
        assert duration.processing == 15
        assert duration.finishing == 10
        assert duration.variation_delta == 30
        assert duration.total == 115  # 60 + 15 + 10 + 30
    
    def test_create_with_negative_variation(self):
        duration = ServiceDuration.create(
            base=90,
            processing=15,
            finishing=10,
            variation_delta=-20
        )
        
        assert duration.total == 95  # 90 + 15 + 10 - 20


class TestPricingService:
    """Test PricingService business logic"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session for testing"""
        return Mock()
    
    @pytest.fixture
    def pricing_service(self, mock_db_session):
        """PricingService instance with mocked database"""
        return PricingService(mock_db_session)
    
    @pytest.fixture
    def mock_service(self):
        """Mock Service entity for testing"""
        service = Mock(spec=Service)
        service.id = str(uuid4())
        service.price = Decimal('80.00')
        service.duration_minutes = 90
        service.processing_time = 15
        service.finishing_time = 10
        return service
    
    @pytest.fixture
    def mock_variation(self):
        """Mock ServiceVariation entity for testing"""
        variation = Mock(spec=ServiceVariation)
        variation.id = str(uuid4())
        variation.price_delta = Decimal('25.00')
        variation.duration_delta = 30
        return variation
    
    def test_init_stores_db_session(self, mock_db_session):
        service = PricingService(mock_db_session)
        assert service.db == mock_db_session
    
    def test_calculate_service_price_without_variation(self, pricing_service, mock_service):
        price = pricing_service.calculate_service_price(mock_service)
        
        assert isinstance(price, ServicePrice)
        assert price.base == Decimal('80.00')
        assert price.variation_delta == Decimal('0')
        assert price.final == Decimal('80.00')
    
    def test_calculate_service_price_with_variation(self, pricing_service, mock_service, mock_variation):
        price = pricing_service.calculate_service_price(mock_service, mock_variation)
        
        assert isinstance(price, ServicePrice)
        assert price.base == Decimal('80.00')
        assert price.variation_delta == Decimal('25.00')
        assert price.final == Decimal('105.00')
    
    def test_calculate_service_price_with_none_price(self, pricing_service, mock_db_session):
        service = Mock(spec=Service)
        service.price = None
        
        price = pricing_service.calculate_service_price(service)
        
        assert price.base == Decimal('0')
        assert price.final == Decimal('0')
    
    def test_calculate_service_duration_without_variation(self, pricing_service, mock_service):
        duration = pricing_service.calculate_service_duration(mock_service)
        
        assert isinstance(duration, ServiceDuration)
        assert duration.base == 90
        assert duration.processing == 15
        assert duration.finishing == 10
        assert duration.variation_delta == 0
        assert duration.total == 115  # 90 + 15 + 10
    
    def test_calculate_service_duration_with_variation(self, pricing_service, mock_service, mock_variation):
        duration = pricing_service.calculate_service_duration(mock_service, mock_variation)
        
        assert isinstance(duration, ServiceDuration)
        assert duration.base == 90
        assert duration.processing == 15
        assert duration.finishing == 10
        assert duration.variation_delta == 30
        assert duration.total == 145  # 90 + 15 + 10 + 30
    
    def test_calculate_service_duration_with_none_values(self, pricing_service, mock_db_session):
        service = Mock(spec=Service)
        service.duration_minutes = None
        service.processing_time = None
        service.finishing_time = None
        
        duration = pricing_service.calculate_service_duration(service)
        
        assert duration.base == 0
        assert duration.processing == 0
        assert duration.finishing == 0
        assert duration.total == 0
    
    def test_calculate_service_complete(self, pricing_service, mock_service, mock_variation):
        calculation = pricing_service.calculate_service_complete(mock_service, mock_variation)
        
        assert isinstance(calculation, ServiceCalculation)
        assert calculation.service_id == mock_service.id
        assert calculation.variation_id == mock_variation.id
        assert calculation.price.final == Decimal('105.00')  # 80 + 25
        assert calculation.duration.total == 145  # 90 + 15 + 10 + 30
    
    def test_calculate_service_complete_without_variation(self, pricing_service, mock_service):
        calculation = pricing_service.calculate_service_complete(mock_service)
        
        assert isinstance(calculation, ServiceCalculation)
        assert calculation.service_id == mock_service.id
        assert calculation.variation_id is None
        assert calculation.price.final == Decimal('80.00')
        assert calculation.duration.total == 115  # 90 + 15 + 10
    
    def test_calculate_group_totals_single_service(self, pricing_service, mock_service):
        # Use clean architecture: calculate service first, then group totals
        calculation = pricing_service.calculate_service_complete(mock_service, None)
        service_calculations = [calculation]
        
        totals = pricing_service.calculate_group_totals(service_calculations)
        
        assert isinstance(totals, GroupTotals)
        assert totals.total_price == Decimal('80.00')
        assert totals.total_duration == 115
        assert totals.service_count == 1
    
    def test_calculate_group_totals_multiple_services(self, pricing_service, mock_service, mock_variation):
        # Create second service
        service2 = Mock(spec=Service)
        service2.id = str(uuid4())
        service2.price = Decimal('60.00')
        service2.duration_minutes = 45
        service2.processing_time = 10
        service2.finishing_time = 5
        
        # Use clean architecture: calculate each service, then group totals
        calc1 = pricing_service.calculate_service_complete(mock_service, mock_variation)  # 105.00, 145 minutes
        calc2 = pricing_service.calculate_service_complete(service2, None)               # 60.00, 60 minutes
        service_calculations = [calc1, calc2]
        
        totals = pricing_service.calculate_group_totals(service_calculations)
        
        assert totals.total_price == Decimal('165.00')  # 105 + 60
        assert totals.total_duration == 205  # 145 + 60
        assert totals.service_count == 2
    
    # Removed outdated test methods:
    # - get_service_by_id: Not part of clean architecture (use batch loading)
    # - get_variation_by_id: Not part of clean architecture (use batch loading)
    # These methods were test-only utilities, not production functionality


class TestPricingServiceIntegration:
    """Integration-style tests that verify the exact calculations from existing code"""
    
    @pytest.fixture
    def mock_db_session(self):
        return Mock()
    
    @pytest.fixture
    def pricing_service(self, mock_db_session):
        return PricingService(mock_db_session)
    
    def test_matches_existing_kanban_calculation_without_variation(self, pricing_service):
        """Test that calculations match existing kanban_service.py logic"""
        # Simulate service from existing code
        service = Mock(spec=Service)
        service.price = Decimal('50.00')
        service.duration_minutes = 60
        service.processing_time = 15
        service.finishing_time = 10
        
        # Calculate using new service
        price = pricing_service.calculate_service_price(service)
        duration = pricing_service.calculate_service_duration(service)
        
        # Verify matches existing calculation logic:
        # final_price = service.price (no variation)
        assert price.final == Decimal('50.00')
        
        # final_duration = duration_minutes + processing_time + finishing_time
        assert duration.total == 85  # 60 + 15 + 10
    
    def test_matches_existing_kanban_calculation_with_variation(self, pricing_service):
        """Test that calculations match existing kanban_service.py logic with variation"""
        # Simulate service and variation from existing code
        service = Mock(spec=Service)
        service.price = Decimal('80.00')
        service.duration_minutes = 90
        service.processing_time = 15
        service.finishing_time = 10
        
        variation = Mock(spec=ServiceVariation)
        variation.price_delta = Decimal('20.00')
        variation.duration_delta = 30
        
        # Calculate using new service
        price = pricing_service.calculate_service_price(service, variation)
        duration = pricing_service.calculate_service_duration(service, variation)
        
        # Verify matches existing calculation logic:
        # final_price = service.price + variation.price_delta
        assert price.final == Decimal('100.00')  # 80 + 20
        
        # final_duration = (duration_minutes + processing_time + finishing_time) + variation.duration_delta
        assert duration.total == 145  # (90 + 15 + 10) + 30
    
    def test_edge_case_zero_values(self, pricing_service):
        """Test edge cases with zero/None values"""
        service = Mock(spec=Service)
        service.price = Decimal('0')
        service.duration_minutes = 0
        service.processing_time = 0
        service.finishing_time = 0
        
        variation = Mock(spec=ServiceVariation)
        variation.price_delta = Decimal('0')
        variation.duration_delta = 0
        
        price = pricing_service.calculate_service_price(service, variation)
        duration = pricing_service.calculate_service_duration(service, variation)
        
        assert price.final == Decimal('0')
        assert duration.total == 0
    
    def test_edge_case_negative_deltas(self, pricing_service):
        """Test negative price and duration deltas"""
        service = Mock(spec=Service)
        service.price = Decimal('100.00')
        service.duration_minutes = 120
        service.processing_time = 20
        service.finishing_time = 15
        
        variation = Mock(spec=ServiceVariation)
        variation.price_delta = Decimal('-25.00')
        variation.duration_delta = -30
        
        price = pricing_service.calculate_service_price(service, variation)
        duration = pricing_service.calculate_service_duration(service, variation)
        
        assert price.final == Decimal('75.00')  # 100 - 25
        assert duration.total == 125  # (120 + 20 + 15) - 30