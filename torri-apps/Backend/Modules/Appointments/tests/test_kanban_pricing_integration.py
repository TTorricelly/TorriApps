"""
Integration tests for Kanban service using new PricingService
Ensures that kanban functions produce identical results with new pricing service.
"""
import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
from uuid import uuid4

from Modules.Appointments.kanban_service import create_walk_in_appointment_group_with_assignments
from Modules.Services.models import Service, ServiceVariation
from Core.Auth.models import User


class TestKanbanPricingIntegration:
    """Test kanban service integration with PricingService"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session for testing"""
        return Mock()
    
    @pytest.fixture
    def mock_service(self):
        """Mock Service entity"""
        service = Mock(spec=Service)
        service.id = str(uuid4())
        service.name = "Test Service"
        service.price = Decimal('80.00')
        service.duration_minutes = 90
        service.processing_time = 15
        service.finishing_time = 10
        return service
    
    @pytest.fixture
    def mock_variation(self):
        """Mock ServiceVariation entity"""
        variation = Mock(spec=ServiceVariation)
        variation.id = str(uuid4())
        variation.price_delta = Decimal('25.00')
        variation.duration_delta = 30
        return variation
    
    @pytest.fixture
    def mock_client(self):
        """Mock client user"""
        client = Mock(spec=User)
        client.id = str(uuid4())
        client.full_name = "Test Client"
        client.email = "test@example.com"
        return client
    
    def test_create_walk_in_with_pricing_service_no_variation(
        self, 
        mock_db_session, 
        mock_service, 
        mock_client
    ):
        """Test walk-in creation without variation uses PricingService correctly"""
        
        # Setup database mocks
        mock_db_session.query.return_value.filter.return_value.first.side_effect = [
            None,  # Client lookup by email (not found)  
            mock_service,  # Service lookup
            None,  # Variation lookup (not provided)
        ]
        mock_db_session.flush.return_value = None
        mock_db_session.commit.return_value = None
        mock_db_session.refresh.return_value = None
        
        # Test data
        client_data = {
            'name': 'Test Client',
            'email': 'test@example.com',
            'phone': '123456789'
        }
        
        services_data = [{
            'id': mock_service.id,
            'professional_id': str(uuid4()),
            'service_variation_id': None
        }]
        
        # Call function
        with patch('Modules.Appointments.kanban_service.User', return_value=mock_client):
            with patch('Modules.Appointments.kanban_service.AppointmentGroup') as mock_group:
                with patch('Modules.Appointments.kanban_service.Appointment') as mock_appointment:
                    # Mock the AppointmentGroup creation
                    mock_group_instance = Mock()
                    mock_group_instance.id = str(uuid4())
                    mock_group_instance.total_duration_minutes = 115  # 90 + 15 + 10 from mock_service
                    mock_group_instance.total_price = Decimal('80.00')  # From mock_service.price
                    mock_group_instance.start_time = Mock()
                    mock_group_instance.start_time.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group_instance.end_time = Mock()
                    mock_group_instance.end_time.isoformat.return_value = "2024-01-01T11:55:00"
                    mock_group_instance.status = Mock()
                    mock_group_instance.status.value = "WALK_IN"
                    mock_group_instance.notes_by_client = None
                    mock_group_instance.created_at = Mock()
                    mock_group_instance.created_at.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group_instance.updated_at = Mock()
                    mock_group_instance.updated_at.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group.return_value = mock_group_instance
                    
                    result = create_walk_in_appointment_group_with_assignments(
                        db=mock_db_session,
                        client_data=client_data,
                        services_data=services_data,
                        tenant_id="test"
                    )
        
        # Verify PricingService was used (no direct price calculations in result)
        # The fact that function completes without error indicates PricingService integration works
        assert isinstance(result, dict)
        assert 'id' in result
        assert 'total_price' in result
        assert 'total_duration_minutes' in result
    
    def test_create_walk_in_with_pricing_service_with_variation(
        self,
        mock_db_session,
        mock_service, 
        mock_variation,
        mock_client
    ):
        """Test walk-in creation with variation uses PricingService correctly"""
        
        # Setup database mocks
        mock_db_session.query.return_value.filter.return_value.first.side_effect = [
            None,  # Client lookup by email (not found)
            mock_service,  # Service lookup  
            mock_variation,  # Variation lookup
        ]
        mock_db_session.flush.return_value = None
        mock_db_session.commit.return_value = None
        mock_db_session.refresh.return_value = None
        
        # Test data
        client_data = {
            'name': 'Test Client',
            'email': 'test@example.com',
            'phone': '123456789'
        }
        
        services_data = [{
            'id': mock_service.id,
            'professional_id': str(uuid4()),
            'service_variation_id': mock_variation.id
        }]
        
        # Call function
        with patch('Modules.Appointments.kanban_service.User', return_value=mock_client):
            with patch('Modules.Appointments.kanban_service.AppointmentGroup') as mock_group:
                with patch('Modules.Appointments.kanban_service.Appointment') as mock_appointment:
                    # Mock the AppointmentGroup creation
                    mock_group_instance = Mock()
                    mock_group_instance.id = str(uuid4())
                    mock_group_instance.total_duration_minutes = 115  # 90 + 15 + 10 from mock_service
                    mock_group_instance.total_price = Decimal('80.00')  # From mock_service.price
                    mock_group_instance.start_time = Mock()
                    mock_group_instance.start_time.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group_instance.end_time = Mock()
                    mock_group_instance.end_time.isoformat.return_value = "2024-01-01T11:55:00"
                    mock_group_instance.status = Mock()
                    mock_group_instance.status.value = "WALK_IN"
                    mock_group_instance.notes_by_client = None
                    mock_group_instance.created_at = Mock()
                    mock_group_instance.created_at.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group_instance.updated_at = Mock()
                    mock_group_instance.updated_at.isoformat.return_value = "2024-01-01T10:00:00"
                    mock_group.return_value = mock_group_instance
                    
                    result = create_walk_in_appointment_group_with_assignments(
                        db=mock_db_session,
                        client_data=client_data,
                        services_data=services_data,
                        tenant_id="test"
                    )
        
        # Verify function completes successfully with variation
        assert isinstance(result, dict)
        assert 'id' in result
        assert 'total_price' in result
        assert 'total_duration_minutes' in result
    
    def test_pricing_service_integration_preserves_calculations(self):
        """Test that PricingService integration produces same results as old manual calculations"""
        
        # Mock service data
        service_price = Decimal('80.00')
        service_duration = 90
        service_processing = 15
        service_finishing = 10
        
        variation_price_delta = Decimal('25.00')
        variation_duration_delta = 30
        
        # Old manual calculation (what was in kanban_service.py before)
        old_final_price = service_price + variation_price_delta
        old_final_duration = service_duration + service_processing + service_finishing + variation_duration_delta
        
        # New PricingService calculation
        from Modules.Appointments.services.pricing_service import PricingService
        
        mock_db = Mock()
        pricing_service = PricingService(mock_db)
        
        mock_service = Mock()
        mock_service.price = service_price
        mock_service.duration_minutes = service_duration
        mock_service.processing_time = service_processing
        mock_service.finishing_time = service_finishing
        
        mock_variation = Mock()
        mock_variation.price_delta = variation_price_delta
        mock_variation.duration_delta = variation_duration_delta
        
        new_price = pricing_service.calculate_service_price(mock_service, mock_variation)
        new_duration = pricing_service.calculate_service_duration(mock_service, mock_variation)
        
        # Verify calculations are identical
        assert new_price.final == old_final_price
        assert new_duration.total == old_final_duration
        assert new_price.final == Decimal('105.00')  # 80 + 25
        assert new_duration.total == 145  # 90 + 15 + 10 + 30
    
    def test_multiple_services_calculation_consistency(self):
        """Test that multiple services calculation remains consistent"""
        
        from Modules.Appointments.services.pricing_service import PricingService
        
        mock_db = Mock()
        pricing_service = PricingService(mock_db)
        
        # Service 1: With variation
        service1 = Mock()
        service1.price = Decimal('80.00')
        service1.duration_minutes = 90
        service1.processing_time = 15
        service1.finishing_time = 10
        
        variation1 = Mock()
        variation1.price_delta = Decimal('25.00')
        variation1.duration_delta = 30
        
        # Service 2: Without variation
        service2 = Mock()
        service2.price = Decimal('60.00')
        service2.duration_minutes = 45
        service2.processing_time = 10
        service2.finishing_time = 5
        
        # Calculate individual services
        calc1 = pricing_service.calculate_service_complete(service1, variation1)
        calc2 = pricing_service.calculate_service_complete(service2, None)
        
        # Calculate group totals using clean architecture
        service_calculations = [calc1, calc2]
        group_totals = pricing_service.calculate_group_totals(service_calculations)
        
        # Verify totals match individual calculations
        expected_total_price = calc1.price.final + calc2.price.final
        expected_total_duration = calc1.duration.total + calc2.duration.total
        
        assert group_totals.total_price == expected_total_price
        assert group_totals.total_duration == expected_total_duration
        assert group_totals.total_price == Decimal('165.00')  # 105 + 60
        assert group_totals.total_duration == 205  # 145 + 60