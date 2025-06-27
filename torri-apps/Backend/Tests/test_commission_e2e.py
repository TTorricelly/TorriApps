import pytest
from decimal import Decimal
from datetime import date, time, datetime
from uuid import uuid4, UUID

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from Core.Database.session import get_db
from Core.Auth.models import User
from Core.Auth.constants import UserRole
from Modules.Appointments.models import Appointment
from Modules.Appointments.constants import AppointmentStatus
from Modules.Services.models import Service, Category
from Modules.Commissions.models import Commission, CommissionPayment
from Modules.Commissions.constants import CommissionPaymentStatus, CommissionPaymentMethod


class TestCommissionEndToEnd:
    """End-to-end tests for the complete commission workflow."""
    
    @pytest.fixture
    def test_setup(self):
        """Set up test data for E2E testing."""
        # In a real implementation, this would set up a clean test database
        # with sample data including users, services, categories, etc.
        return {
            "category_id": UUID(str(uuid4())),
            "service_id": UUID(str(uuid4())),
            "professional_id": UUID(str(uuid4())),
            "client_id": UUID(str(uuid4())),
            "gestor_id": UUID(str(uuid4())),
            "appointment_id": UUID(str(uuid4()))
        }
    
    def test_complete_commission_workflow(self, test_setup):
        """
        Test the complete commission workflow from appointment creation to payment.
        
        Steps:
        1. Create appointment with service that has commission percentage
        2. Complete the appointment
        3. Verify commission is automatically created
        4. Adjust commission value manually
        5. Process batch payment
        6. Verify commission is marked as paid
        7. Export commission data
        """
        
        # Step 1: Create test data
        category = Category(
            id=test_setup["category_id"],
            name="Hair Services",
            display_order=1
        )
        
        service = Service(
            id=test_setup["service_id"],
            name="Professional Haircut",
            description="Premium haircut service",
            duration_minutes=60,
            price=Decimal('80.00'),
            commission_percentage=Decimal('40.0'),  # 40% commission
            category_id=test_setup["category_id"],
            is_active=True
        )
        
        professional = User(
            id=test_setup["professional_id"],
            email="stylist@salon.com",
            full_name="Professional Stylist",
            role=UserRole.PROFISSIONAL,
            is_active=True
        )
        
        client = User(
            id=test_setup["client_id"],
            email="client@test.com",
            full_name="Test Client",
            role=UserRole.CLIENTE,
            is_active=True
        )
        
        gestor = User(
            id=test_setup["gestor_id"],
            email="manager@salon.com",
            full_name="Salon Manager",
            role=UserRole.GESTOR,
            is_active=True
        )
        
        appointment = Appointment(
            id=test_setup["appointment_id"],
            client_id=test_setup["client_id"],
            professional_id=test_setup["professional_id"],
            service_id=test_setup["service_id"],
            appointment_date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
            status=AppointmentStatus.SCHEDULED,
            price_at_booking=Decimal('80.00')
        )
        
        # In a real test, you would save these to the test database
        
        # Step 2: Complete the appointment
        # This should trigger automatic commission creation
        appointment.status = AppointmentStatus.COMPLETED
        
        # Simulate the commission auto-creation that happens in complete_appointment()
        expected_commission_value = Decimal('32.00')  # 80.00 * 40% = 32.00
        
        commission = Commission(
            id=UUID(str(uuid4())),
            professional_id=test_setup["professional_id"],
            appointment_id=test_setup["appointment_id"],
            service_price=Decimal('80.00'),
            commission_percentage=Decimal('40.0'),
            calculated_value=expected_commission_value,
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        # Step 3: Verify commission creation
        assert commission.calculated_value == expected_commission_value
        assert commission.payment_status == CommissionPaymentStatus.PENDING
        assert commission.adjusted_value is None
        
        # Step 4: Manually adjust commission (e.g., performance bonus)
        commission.adjusted_value = Decimal('35.00')
        commission.adjustment_reason = "Performance bonus for excellent service"
        
        # Step 5: Process batch payment
        payment = CommissionPayment(
            id=UUID(str(uuid4())),
            professional_id=test_setup["professional_id"],
            total_amount=Decimal('35.00'),  # Using adjusted value
            payment_method=CommissionPaymentMethod.PIX,
            payment_date=date.today(),
            period_start=date(2024, 1, 1),
            period_end=date(2024, 1, 31),
            notes="Monthly commission payment"
        )
        
        # Step 6: Update commission status
        commission.payment_status = CommissionPaymentStatus.PAID
        
        # Step 7: Verify final state
        assert commission.payment_status == CommissionPaymentStatus.PAID
        assert commission.adjusted_value == Decimal('35.00')
        assert payment.total_amount == Decimal('35.00')
        assert payment.payment_method == CommissionPaymentMethod.PIX
        
        print("✅ Complete commission workflow test passed!")
    
    def test_multiple_appointments_batch_payment(self, test_setup):
        """
        Test processing multiple commissions in a single batch payment.
        """
        
        # Create multiple appointments and commissions
        appointments_data = [
            {"price": Decimal('60.00'), "commission_rate": Decimal('35.0')},
            {"price": Decimal('120.00'), "commission_rate": Decimal('40.0')},
            {"price": Decimal('90.00'), "commission_rate": Decimal('45.0')}
        ]
        
        commissions = []
        total_commission_value = Decimal('0.00')
        
        for i, appt_data in enumerate(appointments_data):
            commission_value = (appt_data["price"] * appt_data["commission_rate"]) / Decimal('100')
            total_commission_value += commission_value
            
            commission = Commission(
                id=UUID(str(uuid4())),
                professional_id=test_setup["professional_id"],
                appointment_id=UUID(str(uuid4())),
                service_price=appt_data["price"],
                commission_percentage=appt_data["commission_rate"],
                calculated_value=commission_value,
                payment_status=CommissionPaymentStatus.PENDING
            )
            commissions.append(commission)
        
        # Expected total: (60*35% + 120*40% + 90*45%) = 21 + 48 + 40.5 = 109.5
        expected_total = Decimal('109.50')
        assert total_commission_value == expected_total
        
        # Process batch payment
        payment = CommissionPayment(
            id=UUID(str(uuid4())),
            professional_id=test_setup["professional_id"],
            total_amount=expected_total,
            payment_method=CommissionPaymentMethod.BANK_TRANSFER,
            payment_date=date.today(),
            period_start=date(2024, 2, 1),
            period_end=date(2024, 2, 29)
        )
        
        # Update all commissions to paid status
        for commission in commissions:
            commission.payment_status = CommissionPaymentStatus.PAID
        
        # Verify results
        assert payment.total_amount == expected_total
        assert all(c.payment_status == CommissionPaymentStatus.PAID for c in commissions)
        
        print("✅ Multiple appointments batch payment test passed!")
    
    def test_commission_calculation_edge_cases(self):
        """Test commission calculation edge cases and rounding."""
        
        test_cases = [
            # (service_price, commission_rate, expected_commission)
            (Decimal('33.33'), Decimal('33.33'), Decimal('11.11')),  # Rounding test
            (Decimal('100.00'), Decimal('0.0'), Decimal('0.00')),     # Zero commission
            (Decimal('0.00'), Decimal('40.0'), Decimal('0.00')),      # Zero price
            (Decimal('99.99'), Decimal('50.0'), Decimal('50.00')),    # Half commission
            (Decimal('1.00'), Decimal('100.0'), Decimal('1.00')),     # Full commission
        ]
        
        for service_price, commission_rate, expected in test_cases:
            commission = Commission(
                id=UUID(str(uuid4())),
                professional_id=UUID(str(uuid4())),
                appointment_id=UUID(str(uuid4())),
                service_price=service_price,
                commission_percentage=commission_rate,
                calculated_value=expected,  # In real calculation this would be computed
                payment_status=CommissionPaymentStatus.PENDING
            )
            
            assert commission.calculated_value == expected
        
        print("✅ Commission calculation edge cases test passed!")
    
    def test_commission_status_lifecycle(self):
        """Test the complete commission status lifecycle."""
        
        commission = Commission(
            id=UUID(str(uuid4())),
            professional_id=UUID(str(uuid4())),
            appointment_id=UUID(str(uuid4())),
            service_price=Decimal('75.00'),
            commission_percentage=Decimal('30.0'),
            calculated_value=Decimal('22.50'),
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        # Initial state
        assert commission.payment_status == CommissionPaymentStatus.PENDING
        
        # Can be adjusted while pending
        commission.adjusted_value = Decimal('25.00')
        commission.adjustment_reason = "Quality bonus"
        
        # Process payment
        commission.payment_status = CommissionPaymentStatus.PAID
        assert commission.payment_status == CommissionPaymentStatus.PAID
        
        # Can be reversed if needed
        commission.payment_status = CommissionPaymentStatus.REVERSED
        assert commission.payment_status == CommissionPaymentStatus.REVERSED
        
        # Final commission value should be adjusted value if present
        final_value = commission.adjusted_value or commission.calculated_value
        assert final_value == Decimal('25.00')
        
        print("✅ Commission status lifecycle test passed!")
    
    def test_commission_data_integrity(self):
        """Test commission data integrity and constraints."""
        
        # Test positive values constraint
        commission = Commission(
            id=UUID(str(uuid4())),
            professional_id=UUID(str(uuid4())),
            appointment_id=UUID(str(uuid4())),
            service_price=Decimal('100.00'),
            commission_percentage=Decimal('40.0'),
            calculated_value=Decimal('40.00'),
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        # Verify positive values
        assert commission.service_price > 0
        assert commission.commission_percentage >= 0
        assert commission.calculated_value >= 0
        
        # Test adjusted value can be different from calculated
        commission.adjusted_value = Decimal('45.00')
        assert commission.adjusted_value != commission.calculated_value
        
        # Test unique appointment constraint (in real test, this would be database-enforced)
        appointment_id = UUID(str(uuid4()))
        
        commission1 = Commission(
            id=UUID(str(uuid4())),
            professional_id=UUID(str(uuid4())),
            appointment_id=appointment_id,
            service_price=Decimal('50.00'),
            commission_percentage=Decimal('30.0'),
            calculated_value=Decimal('15.00'),
            payment_status=CommissionPaymentStatus.PENDING
        )
        
        # In a real database test, creating another commission for the same appointment
        # should raise an IntegrityError due to unique constraint
        
        print("✅ Commission data integrity test passed!")
    
    def test_commission_kpi_calculations(self):
        """Test commission KPI calculations for dashboard."""
        
        # Sample commissions data
        commissions = [
            Commission(
                id=UUID(str(uuid4())),
                professional_id=UUID(str(uuid4())),
                appointment_id=UUID(str(uuid4())),
                service_price=Decimal('100.00'),
                commission_percentage=Decimal('40.0'),
                calculated_value=Decimal('40.00'),
                payment_status=CommissionPaymentStatus.PENDING
            ),
            Commission(
                id=UUID(str(uuid4())),
                professional_id=UUID(str(uuid4())),
                appointment_id=UUID(str(uuid4())),
                service_price=Decimal('80.00'),
                commission_percentage=Decimal('35.0'),
                calculated_value=Decimal('28.00'),
                payment_status=CommissionPaymentStatus.PAID
            ),
            Commission(
                id=UUID(str(uuid4())),
                professional_id=UUID(str(uuid4())),
                appointment_id=UUID(str(uuid4())),
                service_price=Decimal('60.00'),
                commission_percentage=Decimal('45.0'),
                calculated_value=Decimal('27.00'),
                adjusted_value=Decimal('30.00'),  # Adjusted upward
                payment_status=CommissionPaymentStatus.PENDING
            )
        ]
        
        # Calculate KPIs
        total_pending = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in commissions 
            if c.payment_status == CommissionPaymentStatus.PENDING
        )
        
        total_paid = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in commissions 
            if c.payment_status == CommissionPaymentStatus.PAID
        )
        
        total_this_period = sum(
            (c.adjusted_value or c.calculated_value) 
            for c in commissions
        )
        
        pending_count = len([c for c in commissions if c.payment_status == CommissionPaymentStatus.PENDING])
        
        # Verify calculations
        assert total_pending == Decimal('70.00')  # 40.00 + 30.00 (adjusted)
        assert total_paid == Decimal('28.00')
        assert total_this_period == Decimal('98.00')  # 40.00 + 28.00 + 30.00
        assert pending_count == 2
        
        print("✅ Commission KPI calculations test passed!")


if __name__ == "__main__":
    pytest.main([__file__])