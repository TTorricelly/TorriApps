"""
Comprehensive unit tests for AppointmentFactory
Tests the complete appointment creation workflow with proper mocking.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from Modules.Appointments.services.appointment_factory import AppointmentFactory
from Modules.Appointments.domain.value_objects import (
    AppointmentData, ClientData, ServiceCalculation, ServicePrice, ServiceDuration, GroupTotals, ClientResult
)


class TestAppointmentFactory:
    """Test AppointmentFactory orchestration functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.appointment_factory = AppointmentFactory(self.mock_db)
        
        # Mock the services created by the factory
        self.appointment_factory.client_service = Mock()
        self.appointment_factory.pricing_service = Mock()
    
    def test_init_creates_services(self):
        """Test that factory initializes with required services."""
        factory = AppointmentFactory(self.mock_db)
        
        assert factory.db == self.mock_db
        assert factory.client_service is not None
        assert factory.pricing_service is not None
        assert factory.brazil_tz is not None
    
    @patch('Modules.Appointments.services.appointment_factory.datetime')
    def test_prepare_appointment_data_valid_input(self, mock_datetime):
        """Test preparation of appointment data with valid inputs."""
        # Setup datetime mock
        mock_now = datetime(2024, 1, 15, 10, 0, 0)
        mock_datetime.now.return_value = mock_now
        
        # Setup database mocks
        mock_service = Mock()
        mock_service.id = 'service-1'
        mock_service.price = Decimal('100.00')
        mock_service.duration_minutes = 60
        mock_service.processing_time = 15
        mock_service.finishing_time = 10
        
        mock_variation = Mock()
        mock_variation.id = 'variation-1'
        mock_variation.price_delta = Decimal('25.00')
        mock_variation.duration_delta = 30
        
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_service, mock_variation
        ]
        
        # Setup client service mock
        mock_client = Mock()
        mock_client.id = 'client-1'
        mock_client_result = Mock()
        mock_client_result.client = mock_client
        mock_client_result.was_created = False
        
        self.appointment_factory.client_service.get_or_create_client.return_value = mock_client_result
        
        # Setup pricing service mock
        mock_price = ServicePrice.create(Decimal('100.00'), Decimal('25.00'))
        mock_duration = ServiceDuration.create(60, 15, 10, 30)
        mock_calculation = ServiceCalculation(
            price=mock_price,
            duration=mock_duration,
            service_id='service-1',
            variation_id='variation-1'
        )
        
        self.appointment_factory.pricing_service.calculate_service_complete.return_value = mock_calculation
        
        # Mock batch loading methods
        self.appointment_factory._load_services_batch = Mock(return_value={'service-1': mock_service})
        self.appointment_factory._load_variations_batch = Mock(return_value={'variation-1': mock_variation})
        
        # Test data
        client_data = {'name': 'John Doe', 'email': 'john@example.com'}
        services_data = [
            {
                'id': 'service-1',
                'service_variation_id': 'variation-1',
                'professional_id': 'prof-1'
            }
        ]
        
        # Execute
        result = self.appointment_factory._prepare_appointment_data(client_data, services_data)
        
        # Verify
        assert isinstance(result, AppointmentData)
        assert len(result.service_calculations) == 1
        assert result.service_calculations[0] == mock_calculation
        assert result.professional_assignments['service-1'] == 'prof-1'
        assert result.group_totals.total_price == Decimal('125.00')
        assert result.group_totals.total_duration == 115
    
    def test_prepare_appointment_data_no_services_error(self):
        """Test error when no valid services provided."""
        # Mock client service
        mock_client_result = Mock()
        self.appointment_factory.client_service.get_or_create_client.return_value = mock_client_result
        
        # Mock batch loading methods to return empty maps (no services found)
        self.appointment_factory._load_services_batch = Mock(return_value={})
        self.appointment_factory._load_variations_batch = Mock(return_value={})
        
        client_data = {'name': 'John Doe'}
        services_data = [{'id': 'invalid-service', 'professional_id': 'prof-1'}]
        
        # Execute & Verify
        with pytest.raises(ValueError, match="No valid services provided"):
            self.appointment_factory._prepare_appointment_data(client_data, services_data)
    
    @patch('Modules.Appointments.services.appointment_factory.datetime')
    def test_create_appointment_group(self, mock_datetime):
        """Test appointment group creation with proper timing."""
        # Setup datetime mock
        mock_now = datetime(2024, 1, 15, 10, 30, 45)
        mock_datetime.now.return_value = mock_now
        
        # Setup client and client result
        mock_client = Mock()
        mock_client.id = 'client-1'
        mock_client_result = ClientResult(client=mock_client, was_created=False)
        
        # Setup appointment data with client result
        mock_calculation = ServiceCalculation(
            price=ServicePrice.create(Decimal('100.00')),
            duration=ServiceDuration.create(90),
            service_id='service-1'
        )
        
        appointment_data = AppointmentData.create(
            client_result=mock_client_result,
            service_calculations=[mock_calculation],
            professional_assignments={'service-1': 'prof-1'}
        )
        
        # Mock AppointmentGroup creation
        with patch('Modules.Appointments.services.appointment_factory.AppointmentGroup') as mock_appointment_group_class:
            mock_group = Mock()
            mock_appointment_group_class.return_value = mock_group
            
            # Execute
            result = self.appointment_factory._create_appointment_group(appointment_data)
            
            # Verify appointment group was created with correct parameters
            mock_appointment_group_class.assert_called_once()
            call_kwargs = mock_appointment_group_class.call_args[1]
            assert call_kwargs['client_id'] == 'client-1'
            assert call_kwargs['total_duration_minutes'] == 90
            assert call_kwargs['total_price'] == Decimal('100.00')
            assert call_kwargs['start_time'] == datetime(2024, 1, 15, 10, 30, 0)  # Seconds zeroed
            assert call_kwargs['end_time'] == datetime(2024, 1, 15, 12, 0, 0)  # 90 minutes later
            
            # Verify database operations
            self.mock_db.add.assert_called_once_with(mock_group)
            self.mock_db.flush.assert_called_once()
            
            # Verify return value
            assert result == mock_group
    
    @patch('Modules.Appointments.services.appointment_factory.datetime')
    def test_create_individual_appointments(self, mock_datetime):
        """Test creation of individual appointments with timing."""
        # Setup datetime mock
        mock_now = datetime(2024, 1, 15, 10, 0, 0)
        mock_datetime.now.return_value = mock_now
        
        # Setup appointment group
        mock_group = Mock()
        mock_group.id = 'group-1'
        mock_group.start_time = datetime(2024, 1, 15, 10, 0, 0)
        
        # Setup client and client result
        mock_client = Mock()
        mock_client.id = 'client-1'
        mock_client_result = ClientResult(client=mock_client, was_created=False)
        
        # Setup appointment data with multiple services
        calculations = [
            ServiceCalculation(
                price=ServicePrice.create(Decimal('50.00')),
                duration=ServiceDuration.create(45),
                service_id='service-1'
            ),
            ServiceCalculation(
                price=ServicePrice.create(Decimal('75.00')),
                duration=ServiceDuration.create(60),
                service_id='service-2'
            )
        ]
        
        appointment_data = AppointmentData.create(
            client_result=mock_client_result,
            service_calculations=calculations,
            professional_assignments={'service-1': 'prof-1', 'service-2': 'prof-2'}
        )
        
        # Mock Appointment creation
        with patch('Modules.Appointments.services.appointment_factory.Appointment') as mock_appointment_class:
            mock_appt1 = Mock()
            mock_appt2 = Mock()
            mock_appointment_class.side_effect = [mock_appt1, mock_appt2]
            
            # Execute
            appointments = self.appointment_factory._create_individual_appointments(
                mock_group, appointment_data
            )
            
            # Verify
            assert len(appointments) == 2
            assert appointments == [mock_appt1, mock_appt2]
            
            # Check first appointment creation call
            first_call_kwargs = mock_appointment_class.call_args_list[0][1]
            assert first_call_kwargs['client_id'] == 'client-1'
            assert first_call_kwargs['professional_id'] == 'prof-1'
            assert first_call_kwargs['service_id'] == 'service-1'
            assert first_call_kwargs['group_id'] == 'group-1'
            assert first_call_kwargs['price_at_booking'] == Decimal('50.00')
            
            # Check second appointment creation call
            second_call_kwargs = mock_appointment_class.call_args_list[1][1]
            assert second_call_kwargs['professional_id'] == 'prof-2'
            assert second_call_kwargs['service_id'] == 'service-2'
            assert second_call_kwargs['price_at_booking'] == Decimal('75.00')
            
            # Verify database operations
            assert self.mock_db.add.call_count == 2
            self.mock_db.add.assert_any_call(mock_appt1)
            self.mock_db.add.assert_any_call(mock_appt2)
    
    def test_format_appointment_response(self):
        """Test formatting of appointment response data."""
        # Setup mocks
        mock_group = Mock()
        mock_group.id = 'group-1'
        mock_group.client_id = 'client-1'
        mock_group.total_duration_minutes = 120
        mock_group.total_price = Decimal('150.00')
        mock_group.start_time = datetime(2024, 1, 15, 10, 0, 0)
        mock_group.end_time = datetime(2024, 1, 15, 12, 0, 0)
        mock_group.status.value = 'WALK_IN'
        mock_group.created_at = datetime(2024, 1, 15, 10, 0, 0)
        
        mock_appointment = Mock()
        mock_appointment.id = 'appt-1'
        mock_appointment.professional_id = 'prof-1'
        mock_appointment.service_id = 'service-1'
        mock_appointment.service_variation_id = None
        mock_appointment.appointment_date.isoformat.return_value = '2024-01-15'
        mock_appointment.start_time.isoformat.return_value = '10:00:00'
        mock_appointment.end_time.isoformat.return_value = '11:00:00'
        mock_appointment.status.value = 'WALK_IN'
        mock_appointment.price_at_booking = Decimal('75.00')
        
        appointments = [mock_appointment]
        
        # Setup appointment data
        appointment_data = Mock()
        appointment_data.group_totals.total_price = Decimal('150.00')
        appointment_data.group_totals.total_duration = 120
        appointment_data.group_totals.service_count = 1
        appointment_data.client_result.was_created = False
        
        # Execute
        result = self.appointment_factory._format_appointment_response(
            mock_group, appointments, appointment_data
        )
        
        # Verify structure
        assert 'appointment_group' in result
        assert 'appointments' in result
        assert 'totals' in result
        assert 'client_was_created' in result
        
        # Verify appointment group data
        group_data = result['appointment_group']
        assert group_data['id'] == 'group-1'
        assert group_data['total_price'] == 150.0
        assert group_data['total_duration_minutes'] == 120
        
        # Verify appointments data
        assert len(result['appointments']) == 1
        appt_data = result['appointments'][0]
        assert appt_data['id'] == 'appt-1'
        assert appt_data['professional_id'] == 'prof-1'
        assert appt_data['price_at_booking'] == 75.0
        
        # Verify totals
        totals = result['totals']
        assert totals['total_price'] == 150.0
        assert totals['total_duration'] == 120
        assert totals['service_count'] == 1
        
        # Verify client creation tracking
        assert result['client_was_created'] == False
    
    def test_validate_appointment_request_valid(self):
        """Test validation with valid appointment request."""
        # Setup client service validation
        self.appointment_factory.client_service.validate_client_data = Mock()
        
        # Setup database mocks for service validation
        mock_service = Mock()
        mock_variation = Mock()
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_service, mock_variation
        ]
        
        client_data = {'name': 'John Doe', 'email': 'john@example.com'}
        services_data = [
            {
                'id': 'service-1',
                'professional_id': 'prof-1',
                'service_variation_id': 'variation-1'
            }
        ]
        
        # Should not raise any exception
        self.appointment_factory.validate_appointment_request(client_data, services_data)
        
        # Verify client validation was called
        self.appointment_factory.client_service.validate_client_data.assert_called_once_with(client_data)
    
    def test_validate_appointment_request_no_services(self):
        """Test validation error when no services provided."""
        client_data = {'name': 'John Doe'}
        services_data = []
        
        with pytest.raises(ValueError, match="At least one service must be provided"):
            self.appointment_factory.validate_appointment_request(client_data, services_data)
    
    def test_validate_appointment_request_missing_service_id(self):
        """Test validation error when service ID missing."""
        client_data = {'name': 'John Doe'}
        services_data = [{'professional_id': 'prof-1'}]  # Missing service ID
        
        with pytest.raises(ValueError, match="Service ID is required for each service"):
            self.appointment_factory.validate_appointment_request(client_data, services_data)
    
    def test_validate_appointment_request_missing_professional_id(self):
        """Test validation error when professional ID missing."""
        client_data = {'name': 'John Doe'}
        services_data = [{'id': 'service-1'}]  # Missing professional ID
        
        with pytest.raises(ValueError, match="Professional ID is required for each service"):
            self.appointment_factory.validate_appointment_request(client_data, services_data)
    
    def test_validate_appointment_request_service_not_found(self):
        """Test validation error when service not found."""
        # Setup client service validation
        self.appointment_factory.client_service.validate_client_data = Mock()
        
        # Setup database mock - service not found
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        client_data = {'name': 'John Doe'}
        services_data = [{'id': 'invalid-service', 'professional_id': 'prof-1'}]
        
        with pytest.raises(ValueError, match="Service with ID invalid-service not found"):
            self.appointment_factory.validate_appointment_request(client_data, services_data)
    
    def test_validate_appointment_request_variation_not_found(self):
        """Test validation error when service variation not found."""
        # Setup client service validation
        self.appointment_factory.client_service.validate_client_data = Mock()
        
        # Setup database mocks - service exists, variation doesn't
        mock_service = Mock()
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_service, None  # Service found, variation not found
        ]
        
        client_data = {'name': 'John Doe'}
        services_data = [
            {
                'id': 'service-1',
                'professional_id': 'prof-1',
                'service_variation_id': 'invalid-variation'
            }
        ]
        
        with pytest.raises(ValueError, match="Service variation with ID invalid-variation not found"):
            self.appointment_factory.validate_appointment_request(client_data, services_data)