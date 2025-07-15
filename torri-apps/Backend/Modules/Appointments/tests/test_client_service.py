"""
Comprehensive unit tests for ClientService focusing on business logic
Tests the service without complex SQLAlchemy model dependencies.
Updated to use clean domain architecture with separated value objects.
"""
import pytest
from unittest.mock import Mock, MagicMock
from uuid import uuid4
from Modules.Appointments.services.client_service import ClientService
from Modules.Appointments.domain.value_objects import ClientData, ClientResult


class TestClientData:
    """Test ClientData value object."""
    
    def test_from_dict_with_full_data(self):
        """Test ClientData creation with all fields."""
        data = {
            'id': 'test-id',
            'name': 'John Doe',
            'email': 'john@example.com',
            'phone': '123456789',
            'cpf': '12345678901',
            'nickname': 'Johnny',
            'address_street': 'Main St',
            'address_number': '123',
            'address_complement': 'Apt 1',
            'address_neighborhood': 'Downtown',
            'address_city': 'City',
            'address_state': 'State',
            'address_cep': '12345-678'
        }
        
        client_data = ClientData.from_dict(data)
        
        assert client_data.id == 'test-id'
        assert client_data.name == 'John Doe'
        assert client_data.email == 'john@example.com'
        assert client_data.phone == '123456789'
        assert client_data.cpf == '12345678901'
        assert client_data.nickname == 'Johnny'
        assert client_data.address_street == 'Main St'
        assert client_data.address_number == '123'
        assert client_data.address_complement == 'Apt 1'
        assert client_data.address_neighborhood == 'Downtown'
        assert client_data.address_city == 'City'
        assert client_data.address_state == 'State'
        assert client_data.address_cep == '12345-678'
    
    def test_from_dict_with_minimal_data(self):
        """Test ClientData creation with minimal fields."""
        data = {'name': 'Jane Doe'}
        
        client_data = ClientData.from_dict(data)
        
        assert client_data.name == 'Jane Doe'
        assert client_data.id is None
        assert client_data.email is None
        assert client_data.phone is None
        assert client_data.cpf is None
        assert client_data.nickname is None


class TestClientService:
    """Test ClientService business logic without model dependencies."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.client_service = ClientService(self.mock_db)
    
    def test_get_or_create_client_by_id_found(self):
        """Test getting existing client by ID."""
        # Setup - create a mock client object
        existing_client = Mock()
        existing_client.id = 'test-id'
        existing_client.full_name = 'John Doe'
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_client
        
        client_data = {'id': 'test-id', 'name': 'John Doe'}
        
        # Execute
        result = self.client_service.get_or_create_client(client_data)
        
        # Verify
        assert isinstance(result, ClientResult)
        assert result.client == existing_client
        assert result.was_created == False
    
    def test_get_or_create_client_by_id_not_found(self):
        """Test error when client ID not found."""
        # Setup
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        client_data = {'id': 'nonexistent-id', 'name': 'John Doe'}
        
        # Execute & Verify
        with pytest.raises(ValueError, match="Client with ID nonexistent-id not found"):
            self.client_service.get_or_create_client(client_data)
    
    def test_get_or_create_client_by_email_found(self):
        """Test getting existing client by email."""
        # Setup
        existing_client = Mock()
        existing_client.id = 'test-id'
        existing_client.email = 'john@example.com'
        existing_client.full_name = 'John Doe'
        
        # Mock the query chain for email lookup
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_client
        
        client_data = {'email': 'john@example.com', 'name': 'John Doe'}
        
        # Execute
        result = self.client_service.get_or_create_client(client_data)
        
        # Verify
        assert isinstance(result, ClientResult)
        assert result.client == existing_client
        assert result.was_created == False
    
    def test_create_new_client_no_name_error(self):
        """Test error when creating client without name."""
        # Setup - no existing client found
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        client_data = {'email': 'test@example.com'}  # No name
        
        # Execute & Verify
        with pytest.raises(ValueError, match="Client name is required for new clients"):
            self.client_service.get_or_create_client(client_data)
    
    def test_validate_client_data_valid(self):
        """Test validation with valid data."""
        client_data = {
            'name': 'Valid Client',
            'email': 'valid@example.com'
        }
        
        # Should not raise any exception
        self.client_service.validate_client_data(client_data)
    
    def test_validate_client_data_empty_id(self):
        """Test validation with empty ID."""
        client_data = {'id': '', 'name': 'Test'}
        
        with pytest.raises(ValueError, match="Client ID cannot be empty"):
            self.client_service.validate_client_data(client_data)
    
    def test_validate_client_data_no_name_for_new_client(self):
        """Test validation with missing name for new client."""
        client_data = {'email': 'test@example.com'}  # No ID, no name
        
        with pytest.raises(ValueError, match="Client name is required for new clients"):
            self.client_service.validate_client_data(client_data)
    
    def test_validate_client_data_invalid_email(self):
        """Test validation with invalid email format."""
        client_data = {
            'name': 'Test Client',
            'email': 'invalid-email'  # No @ symbol
        }
        
        with pytest.raises(ValueError, match="Invalid email format"):
            self.client_service.validate_client_data(client_data)
    
    def test_lookup_client_by_id_logic(self):
        """Test direct client lookup by ID logic."""
        # Setup
        expected_client = Mock()
        expected_client.id = 'test-id'
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = expected_client
        
        # Execute
        result = self.client_service._lookup_client_by_id('test-id')
        
        # Verify
        assert result == expected_client
    
    def test_lookup_client_by_email_logic(self):
        """Test direct client lookup by email logic."""
        # Setup
        expected_client = Mock()
        expected_client.email = 'test@example.com'
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = expected_client
        
        # Execute
        result = self.client_service._lookup_client_by_email('test@example.com')
        
        # Verify
        assert result == expected_client


class TestClientResult:
    """Test ClientResult value object."""
    
    def test_client_result_creation(self):
        """Test ClientResult creation."""
        client = Mock()
        client.id = 'test-id'
        
        result = ClientResult(client=client, was_created=True)
        
        assert result.client == client
        assert result.was_created == True
    
    def test_client_result_immutable(self):
        """Test that ClientResult is immutable."""
        client = Mock()
        result = ClientResult(client=client, was_created=False)
        
        # Should not be able to modify frozen dataclass
        with pytest.raises(AttributeError):
            result.was_created = True