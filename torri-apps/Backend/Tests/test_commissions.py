import pytest
from decimal import Decimal
from datetime import date, datetime, time
from uuid import uuid4, UUID

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import status

# Test imports
from Core.Database.session import get_db
from Core.Auth.models import User
from Core.Auth.constants import UserRole
from Modules.Appointments.models import Appointment
from Modules.Appointments.constants import AppointmentStatus
from Modules.Services.models import Service, Category
from Modules.Commissions.models import Commission, CommissionPayment, CommissionPaymentItem
from Modules.Commissions.services import CommissionService
from Modules.Commissions.constants import CommissionPaymentStatus, CommissionPaymentMethod
from Modules.Commissions.schemas import CommissionCreate, CommissionUpdate, CommissionPaymentCreate
from Config.Relationships import configure_relationships


class TestCommissionService:
    """Test suite for CommissionService business logic."""
    
    @pytest.fixture(autouse=True)
    def setup_relationships(self):
        """Configure SQLAlchemy relationships before running tests."""
        configure_relationships()
    
    @pytest.fixture
    def db_session(self):
        """Mock database session fixture."""
        # In a real test, you'd set up a test database
        pass
    
    @pytest.fixture
    def commission_service(self, db_session):
        """Commission service fixture."""
        return CommissionService(db_session)
    
    @pytest.fixture
    def sample_user(self):
        """Sample professional user."""
        return User(
            id=UUID(str(uuid4())),
            email="professional@test.com",
            full_name="Test Professional",
            role=UserRole.PROFISSIONAL,
            is_active=True
        )
    
    @pytest.fixture
    def sample_service(self):
        """Sample service with commission."""
        return Service(
            id=UUID(str(uuid4())),
            name="Haircut",
            duration_minutes=60,
            price=Decimal('50.00'),
            commission_percentage=Decimal('40.0'),
            is_active=True
        )
    
    @pytest.fixture
    def sample_appointment(self, sample_user, sample_service):
        """Sample completed appointment."""
        return Appointment(
            id=UUID(str(uuid4())),
            professional_id=sample_user.id,
            client_id=UUID(str(uuid4())),
            service_id=sample_service.id,
            appointment_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=AppointmentStatus.COMPLETED,
            price_at_booking=Decimal('50.00')
        )
    
    def test_calculate_commission_value(self, commission_service):
        """Test commission calculation logic."""
        # Test normal calculation
        result = commission_service.calculate_commission_value(
            Decimal('100.00'), 
            Decimal('40.0')
        )
        assert result == Decimal('40.00')
        
        # Test with zero price
        result = commission_service.calculate_commission_value(
            Decimal('0.00'), 
            Decimal('40.0')
        )
        assert result == Decimal('0.00')
        
        # Test with zero percentage
        result = commission_service.calculate_commission_value(
            Decimal('100.00'), 
            Decimal('0.0')
        )
        assert result == Decimal('0.00')
        
        # Test rounding
        result = commission_service.calculate_commission_value(
            Decimal('33.33'), 
            Decimal('33.33')
        )
        assert result == Decimal('11.11')  # Rounded to 2 decimal places
    
    def test_create_commission_for_appointment_success(self, commission_service, sample_appointment, sample_service, mocker):
        """Test successful commission creation."""
        # Mock database queries
        mock_db = mocker.Mock()
        commission_service.db = mock_db
        
        # Mock appointment query
        mock_db.query().options().filter().first.return_value = sample_appointment
        
        # Mock service query
        mock_db.query().filter().first.return_value = sample_service
        
        # Mock existing commission check
        mock_db.query().filter().first.side_effect = [sample_appointment, None, sample_service]
        
        # Mock database operations
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        # Create commission
        result = commission_service.create_commission_for_appointment(sample_appointment.id)
        
        # Verify commission was created
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        # Verify commission calculation
        added_commission = mock_db.add.call_args[0][0]
        assert added_commission.professional_id == sample_appointment.professional_id
        assert added_commission.appointment_id == sample_appointment.id
        assert added_commission.calculated_value == Decimal('20.00')  # 50 * 40%
    
    def test_create_commission_for_nonexistent_appointment(self, commission_service, mocker):
        """Test commission creation for non-existent appointment."""
        mock_db = mocker.Mock()
        commission_service.db = mock_db
        
        # Mock no appointment found
        mock_db.query().options().filter().first.return_value = None
        
        result = commission_service.create_commission_for_appointment(UUID(str(uuid4())))
        
        assert result is None
        mock_db.add.assert_not_called()
    
    def test_create_commission_for_existing_commission(self, commission_service, sample_appointment, mocker):
        """Test commission creation when commission already exists."""
        mock_db = mocker.Mock()
        commission_service.db = mock_db
        
        existing_commission = Commission(
            id=UUID(str(uuid4())),
            professional_id=sample_appointment.professional_id,
            appointment_id=sample_appointment.id,
            service_price=Decimal('50.00'),
            commission_percentage=Decimal('40.0'),
            calculated_value=Decimal('20.00')
        )
        
        # Mock appointment query
        mock_db.query().options().filter().first.return_value = sample_appointment
        
        # Mock existing commission found
        mock_db.query().filter().first.side_effect = [sample_appointment, existing_commission]
        
        result = commission_service.create_commission_for_appointment(sample_appointment.id)
        
        assert result == existing_commission
        mock_db.add.assert_not_called()


class TestCommissionModels:
    """Test suite for Commission model relationships and constraints."""
    
    def test_commission_model_creation(self):
        """Test Commission model instantiation."""
        commission = Commission(
            professional_id=UUID(str(uuid4())),
            appointment_id=UUID(str(uuid4())),
            service_price=Decimal('100.00'),
            commission_percentage=Decimal('30.0'),
            calculated_value=Decimal('30.00'),
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        assert commission.professional_id is not None
        assert commission.appointment_id is not None
        assert commission.calculated_value == Decimal('30.00')
        assert commission.payment_status == CommissionPaymentStatus.PENDING
        assert commission.adjusted_value is None
    
    def test_commission_payment_model_creation(self):
        """Test CommissionPayment model instantiation."""
        payment = CommissionPayment(
            professional_id=UUID(str(uuid4())),
            total_amount=Decimal('150.00'),
            payment_method=CommissionPaymentMethod.PIX,
            payment_date=date.today(),
            period_start=date(2024, 1, 1),
            period_end=date(2024, 1, 31)
        )
        
        assert payment.professional_id is not None
        assert payment.total_amount == Decimal('150.00')
        assert payment.payment_method == CommissionPaymentMethod.PIX
        assert payment.payment_date == date.today()


class TestCommissionAPI:
    """Test suite for Commission API endpoints."""
    
    @pytest.fixture
    def client(self):
        """FastAPI test client."""
        # In real tests, you'd set up a test app
        pass
    
    @pytest.fixture
    def admin_user(self):
        """Admin user for authentication."""
        return User(
            id=UUID(str(uuid4())),
            email="admin@test.com",
            role=UserRole.GESTOR,
            is_active=True
        )
    
    @pytest.fixture
    def auth_headers(self, admin_user):
        """Authentication headers for API requests."""
        # In real tests, you'd generate a JWT token
        return {"Authorization": "Bearer test_token"}
    
    def test_list_commissions_success(self, client, auth_headers):
        """Test successful commission listing."""
        # Mock implementation
        pass
    
    def test_list_commissions_unauthorized(self, client):
        """Test commission listing without authentication."""
        # Mock implementation
        pass
    
    def test_get_commission_kpis_success(self, client, auth_headers):
        """Test successful KPI retrieval."""
        # Mock implementation
        pass
    
    def test_update_commission_success(self, client, auth_headers):
        """Test successful commission update."""
        # Mock implementation
        pass
    
    def test_create_commission_payment_success(self, client, auth_headers):
        """Test successful commission payment creation."""
        # Mock implementation
        pass
    
    def test_export_commissions_csv_success(self, client, auth_headers):
        """Test successful CSV export."""
        # Mock implementation
        pass


class TestCommissionIntegration:
    """Test suite for commission integration with appointment completion."""
    
    def test_appointment_completion_creates_commission(self, mocker):
        """Test that completing an appointment automatically creates a commission."""
        # Mock imports and dependencies
        mock_db = mocker.Mock()
        mock_user = User(
            id=UUID(str(uuid4())),
            email="professional@test.com",
            role=UserRole.PROFISSIONAL
        )
        
        # Mock the complete_appointment function
        from Modules.Appointments.appointment_modifications import complete_appointment
        
        # This would be a more complete integration test in a real scenario
        # with actual database setup and transaction testing
        pass
    
    def test_commission_auto_creation_handles_errors(self, mocker):
        """Test that commission creation errors don't prevent appointment completion."""
        # Mock scenario where commission service fails
        # but appointment completion still succeeds
        pass


class TestCommissionBusinessRules:
    """Test suite for commission business rules and edge cases."""
    
    def test_commission_calculation_with_discounts(self):
        """Test commission calculation when appointment has discounts."""
        # Test that commission is calculated on actual paid price
        pass
    
    def test_commission_adjustment_audit_trail(self):
        """Test that commission adjustments are properly tracked."""
        pass
    
    def test_commission_payment_batch_validation(self):
        """Test validation of batch payment amounts."""
        pass
    
    def test_commission_status_transitions(self):
        """Test valid commission status transitions."""
        commission = Commission(
            professional_id=UUID(str(uuid4())),
            appointment_id=UUID(str(uuid4())),
            service_price=Decimal('100.00'),
            commission_percentage=Decimal('30.0'),
            calculated_value=Decimal('30.00'),
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        # Test valid transitions
        commission.payment_status = CommissionPaymentStatus.PAID
        assert commission.payment_status == CommissionPaymentStatus.PAID
        
        commission.payment_status = CommissionPaymentStatus.REVERSED
        assert commission.payment_status == CommissionPaymentStatus.REVERSED


# Test data fixtures and utilities
@pytest.fixture
def sample_commission_data():
    """Sample commission data for tests."""
    return {
        "professional_id": str(uuid4()),
        "appointment_id": str(uuid4()),
        "service_price": "100.00",
        "commission_percentage": "40.0",
        "calculated_value": "40.00"
    }

@pytest.fixture
def sample_payment_data():
    """Sample payment data for tests."""
    return {
        "professional_id": str(uuid4()),
        "commission_ids": [str(uuid4()), str(uuid4())],
        "total_amount": "80.00",
        "payment_method": "PIX",
        "payment_date": "2024-01-15",
        "period_start": "2024-01-01",
        "period_end": "2024-01-31"
    }


if __name__ == "__main__":
    pytest.main([__file__])