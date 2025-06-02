from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as SQLAlchemySession
from uuid import UUID, uuid4
import pytest
from datetime import time, date, timedelta
from decimal import Decimal

import sys
import os

# Add the Backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from Config.Settings import settings as app_settings
from Core.Auth.constants import UserRole
from Modules.Tenants.models import Tenant as TenantModel
from Core.Auth.models import UserTenant as UserTenantModel
from Modules.Services.models import Category, Service
from Modules.Appointments.models import Appointment
from Modules.Appointments.constants import AppointmentStatus
from Modules.Availability.models import ProfessionalAvailability
from Modules.Availability.constants import DayOfWeek
from Core.Security.hashing import get_password_hash


@pytest.fixture(scope="function")
def professional_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates a PROFESSIONAL user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="professional.test@example.com",
        hashed_password=hashed_password,
        role=UserRole.PROFISSIONAL,
        full_name="Professional Test User",
        is_active=True
    )
    db_session_test.add(user)
    db_session_test.commit()
    db_session_test.refresh(user)
    return user


@pytest.fixture(scope="function")
def client_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates a CLIENT user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="client.test@example.com",
        hashed_password=hashed_password,
        role=UserRole.CLIENTE,
        full_name="Client Test User",
        is_active=True
    )
    db_session_test.add(user)
    db_session_test.commit()
    db_session_test.refresh(user)
    return user


@pytest.fixture(scope="function")
def atendente_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates an ATENDENTE user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="atendente.test@example.com",
        hashed_password=hashed_password,
        role=UserRole.ATENDENTE,
        full_name="Atendente Test User",
        is_active=True
    )
    db_session_test.add(user)
    db_session_test.commit()
    db_session_test.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_category(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> Category:
    """Creates a test category."""
    category = Category(
        id=str(uuid4()),  # Convert to string for SQLite
        name="Test Category",
        tenant_id=default_tenant_test.id
    )
    db_session_test.add(category)
    db_session_test.commit()
    db_session_test.refresh(category)
    return category


@pytest.fixture(scope="function")
def test_service(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, test_category: Category, professional_user_test: UserTenantModel) -> Service:
    """Creates a test service."""
    service = Service(
        id=str(uuid4()),  # Convert to string for SQLite
        name="Test Service",
        description="Test service description",
        duration_minutes=30,
        price=Decimal("25.00"),
        commission_percentage=Decimal("10.50"),
        category_id=test_category.id,
        tenant_id=default_tenant_test.id
    )
    service.professionals = [professional_user_test]
    db_session_test.add(service)
    db_session_test.commit()
    db_session_test.refresh(service)
    return service


@pytest.fixture(scope="function")
def test_availability_slot(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, professional_user_test: UserTenantModel) -> ProfessionalAvailability:
    """Creates availability for the professional."""
    slot = ProfessionalAvailability(
        id=str(uuid4()),  # Convert to string for SQLite
        professional_user_id=professional_user_test.id,
        tenant_id=default_tenant_test.id,
        day_of_week=DayOfWeek.MONDAY,
        start_time=time(9, 0),
        end_time=time(17, 0)
    )
    db_session_test.add(slot)
    db_session_test.commit()
    db_session_test.refresh(slot)
    return slot


@pytest.fixture(scope="function")
def test_appointment(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, 
                    client_user_test: UserTenantModel, professional_user_test: UserTenantModel, 
                    test_service: Service) -> Appointment:
    """Creates a test appointment."""
    appointment = Appointment(
        id=str(uuid4()),  # Convert to string for SQLite
        client_id=client_user_test.id,
        professional_id=professional_user_test.id,
        service_id=test_service.id,
        tenant_id=default_tenant_test.id,
        appointment_date=date.today() + timedelta(days=1),
        start_time=time(10, 0),
        end_time=time(10, 30),
        status=AppointmentStatus.SCHEDULED,
        price_at_booking=Decimal("25.00"),
        paid_manually=False,
        notes_by_client="Test appointment notes"
    )
    db_session_test.add(appointment)
    db_session_test.commit()
    db_session_test.refresh(appointment)
    return appointment


@pytest.fixture(scope="function")
def auth_headers_gestor(test_client: TestClient, default_tenant_test: TenantModel, gestor_user_test: UserTenantModel):
    """Returns authentication headers for gestor user."""
    login_data = {
        "email": gestor_user_test.email,
        "password": "testpassword"
    }
    headers = {
        "X-Tenant-ID": str(default_tenant_test.id)
    }
    
    response = test_client.post(f"{app_settings.API_V1_PREFIX}/auth/login", data=login_data, headers=headers)
    token = response.json()["access_token"]
    
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(default_tenant_test.id)
    }


@pytest.fixture(scope="function")
def auth_headers_professional(test_client: TestClient, default_tenant_test: TenantModel, professional_user_test: UserTenantModel):
    """Returns authentication headers for professional user."""
    login_data = {
        "email": professional_user_test.email,
        "password": "testpassword"
    }
    headers = {
        "X-Tenant-ID": str(default_tenant_test.id)
    }
    
    response = test_client.post(f"{app_settings.API_V1_PREFIX}/auth/login", data=login_data, headers=headers)
    token = response.json()["access_token"]
    
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(default_tenant_test.id)
    }


@pytest.fixture(scope="function")
def auth_headers_client(test_client: TestClient, default_tenant_test: TenantModel, client_user_test: UserTenantModel):
    """Returns authentication headers for client user."""
    login_data = {
        "email": client_user_test.email,
        "password": "testpassword"
    }
    headers = {
        "X-Tenant-ID": str(default_tenant_test.id)
    }
    
    response = test_client.post(f"{app_settings.API_V1_PREFIX}/auth/login", data=login_data, headers=headers)
    token = response.json()["access_token"]
    
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(default_tenant_test.id)
    }


@pytest.fixture(scope="function")
def auth_headers_atendente(test_client: TestClient, default_tenant_test: TenantModel, atendente_user_test: UserTenantModel):
    """Returns authentication headers for atendente user."""
    login_data = {
        "email": atendente_user_test.email,
        "password": "testpassword"
    }
    headers = {
        "X-Tenant-ID": str(default_tenant_test.id)
    }
    
    response = test_client.post(f"{app_settings.API_V1_PREFIX}/auth/login", data=login_data, headers=headers)
    token = response.json()["access_token"]
    
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(default_tenant_test.id)
    }


# === AVAILABILITY QUERY TESTS ===

def test_get_professional_daily_availability_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful daily availability retrieval."""
    target_date = date.today()
    # Adjust the target date to Monday if availability slot is for Monday
    while target_date.weekday() != 0:  # 0 is Monday
        target_date += timedelta(days=1)
    
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/professional/{professional_user_test.id}/availability?date={target_date.isoformat()}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["date"] == target_date.isoformat()
    assert "slots" in response_data
    assert len(response_data["slots"]) > 0


def test_get_professional_daily_availability_non_existent_professional(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test availability retrieval for non-existent professional."""
    non_existent_id = "00000000-0000-0000-0000-000000000000"  # Special ID that triggers 404
    target_date = date.today()
    
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/professional/{non_existent_id}/availability?date={target_date.isoformat()}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_get_service_availability_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_service: Service,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful service availability retrieval."""
    current_date = date.today()
    availability_data = {
        "professional_id": str(professional_user_test.id),
        "service_id": str(test_service.id),
        "year": current_date.year,
        "month": current_date.month
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments/services/availability",
        json=availability_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_get_service_availability_non_existent_service(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test service availability retrieval for non-existent service."""
    current_date = date.today()
    availability_data = {
        "professional_id": str(professional_user_test.id),
        "service_id": "00000000-0000-0000-0000-000000000000",  # Non-existent service
        "year": current_date.year,
        "month": current_date.month
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments/services/availability",
        json=availability_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


# === APPOINTMENT CREATION TESTS ===

def test_create_appointment_success_as_gestor(
    test_client: TestClient,
    client_user_test: UserTenantModel,
    professional_user_test: UserTenantModel,
    test_service: Service,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful appointment creation by gestor."""
    # Find a Monday in the future for the appointment
    appointment_date = date.today() + timedelta(days=1)
    while appointment_date.weekday() != 0:  # 0 is Monday
        appointment_date += timedelta(days=1)
    
    appointment_data = {
        "client_id": str(client_user_test.id),
        "professional_id": str(professional_user_test.id),
        "service_id": str(test_service.id),
        "appointment_date": appointment_date.isoformat(),
        "start_time": "10:00:00",
        "notes_by_client": "Test appointment"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments",
        json=appointment_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["client_id"] == appointment_data["client_id"]
    assert response_data["professional_id"] == appointment_data["professional_id"]
    assert response_data["service_id"] == appointment_data["service_id"]
    assert response_data["appointment_date"] == appointment_data["appointment_date"]
    assert response_data["start_time"] == appointment_data["start_time"]
    assert response_data["status"] == AppointmentStatus.SCHEDULED.value
    assert "id" in response_data


def test_create_appointment_success_as_client_self(
    test_client: TestClient,
    client_user_test: UserTenantModel,
    professional_user_test: UserTenantModel,
    test_service: Service,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_client
):
    """Test successful appointment creation by client for themselves."""
    appointment_date = date.today() + timedelta(days=1)
    while appointment_date.weekday() != 0:  # 0 is Monday
        appointment_date += timedelta(days=1)
    
    appointment_data = {
        "client_id": str(client_user_test.id),
        "professional_id": str(professional_user_test.id),
        "service_id": str(test_service.id),
        "appointment_date": appointment_date.isoformat(),
        "start_time": "11:00:00",
        "notes_by_client": "Self-booked appointment"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments",
        json=appointment_data,
        headers=auth_headers_client
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["client_id"] == str(client_user_test.id)


def test_create_appointment_client_booking_for_other(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    professional_user_test: UserTenantModel,
    test_service: Service,
    auth_headers_client
):
    """Test that client cannot book for another client."""
    # Create another client
    hashed_password = get_password_hash("testpassword")
    another_client = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="another.client@example.com",
        hashed_password=hashed_password,
        role=UserRole.CLIENTE,
        full_name="Another Client",
        is_active=True
    )
    db_session_test.add(another_client)
    db_session_test.commit()
    
    appointment_date = date.today() + timedelta(days=1)
    appointment_data = {
        "client_id": str(another_client.id),  # Different client
        "professional_id": str(professional_user_test.id),
        "service_id": str(test_service.id),
        "appointment_date": appointment_date.isoformat(),
        "start_time": "10:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments",
        json=appointment_data,
        headers=auth_headers_client
    )
    
    assert response.status_code == 403


def test_create_appointment_invalid_service(
    test_client: TestClient,
    client_user_test: UserTenantModel,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test appointment creation failure with invalid service."""
    appointment_date = date.today() + timedelta(days=1)
    appointment_data = {
        "client_id": str(client_user_test.id),
        "professional_id": str(professional_user_test.id),
        "service_id": "00000000-0000-0000-0000-000000000000",  # Non-existent service
        "appointment_date": appointment_date.isoformat(),
        "start_time": "10:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments",
        json=appointment_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "Service not found" in response.json()["detail"]


def test_create_appointment_professional_doesnt_offer_service(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    client_user_test: UserTenantModel,
    test_category: Category,
    auth_headers_gestor
):
    """Test appointment creation failure when professional doesn't offer the service."""
    # Create a professional who doesn't offer the service
    hashed_password = get_password_hash("testpassword")
    another_professional = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="another.professional@example.com",
        hashed_password=hashed_password,
        role=UserRole.PROFISSIONAL,
        full_name="Another Professional",
        is_active=True
    )
    db_session_test.add(another_professional)
    
    # Create a service without this professional
    service_without_prof = Service(
        id=str(uuid4()),  # Convert to string for SQLite
        name="Service Without Professional",
        description="A service without the professional",
        duration_minutes=30,
        price=Decimal("30.00"),
        category_id=test_category.id,
        tenant_id=default_tenant_test.id
    )
    db_session_test.add(service_without_prof)
    db_session_test.commit()
    
    appointment_date = date.today() + timedelta(days=1)
    appointment_data = {
        "client_id": str(client_user_test.id),
        "professional_id": str(another_professional.id),
        "service_id": str(service_without_prof.id),
        "appointment_date": appointment_date.isoformat(),
        "start_time": "10:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/appointments",
        json=appointment_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 400
    assert "does not offer service" in response.json()["detail"]


# === APPOINTMENT LISTING TESTS ===

def test_list_appointments_as_gestor(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_gestor
):
    """Test appointment listing by gestor."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    appointment_ids = [appt["id"] for appt in response_data]
    assert str(test_appointment.id) in appointment_ids


def test_list_appointments_as_client_own_only(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_client
):
    """Test that client can only see their own appointments."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments",
        headers=auth_headers_client
    )
    
    assert response.status_code == 200
    response_data = response.json()
    # Should only see own appointments
    for appointment in response_data:
        assert appointment["client"]["id"] == str(test_appointment.client_id)


def test_list_appointments_as_professional_own_only(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_professional
):
    """Test that professional can only see their own appointments."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 200
    response_data = response.json()
    # Should only see own appointments
    for appointment in response_data:
        assert appointment["professional"]["id"] == str(test_appointment.professional_id)


def test_list_appointments_with_filters(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_gestor
):
    """Test appointment listing with filters."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments?status={AppointmentStatus.SCHEDULED.value}&limit=10",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) <= 10
    for appointment in response_data:
        assert appointment["status"] == AppointmentStatus.SCHEDULED.value


def test_get_appointment_by_id_success(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_gestor
):
    """Test successful appointment retrieval by ID."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == str(test_appointment.id)
    assert response_data["status"] == test_appointment.status.value
    assert "client" in response_data
    assert "professional" in response_data
    assert "service" in response_data


def test_get_appointment_by_id_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test appointment retrieval with non-existent ID."""
    non_existent_id = "00000000-0000-0000-0000-000000000000"  # Special ID that triggers 404
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


# === APPOINTMENT MODIFICATION TESTS ===

def test_cancel_appointment_success(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_gestor
):
    """Test successful appointment cancellation."""
    cancel_data = {
        "reason": "Client requested cancellation"
    }
    
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/cancel",
        json=cancel_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == AppointmentStatus.CANCELLED.value


def test_reschedule_appointment_success(
    test_client: TestClient,
    test_appointment: Appointment,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful appointment rescheduling."""
    # Find a Monday in the future for rescheduling
    new_date = date.today() + timedelta(days=8)  # Next week
    while new_date.weekday() != 0:  # 0 is Monday
        new_date += timedelta(days=1)
    
    reschedule_data = {
        "new_date": new_date.isoformat(),
        "new_start_time": "14:00:00",
        "reason": "Client requested different time"
    }
    
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/reschedule",
        json=reschedule_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["appointment_date"] == reschedule_data["new_date"]
    assert response_data["start_time"] == reschedule_data["new_start_time"]


def test_complete_appointment_success_as_professional(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_professional
):
    """Test successful appointment completion by professional."""
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/complete",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == AppointmentStatus.COMPLETED.value


def test_complete_appointment_unauthorized_as_client(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_client
):
    """Test that client cannot complete appointments."""
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/complete",
        headers=auth_headers_client
    )
    
    assert response.status_code == 403


def test_mark_appointment_no_show_success(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_professional
):
    """Test successful appointment no-show marking."""
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/no-show",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == AppointmentStatus.NOSHOW.value


def test_mark_appointment_no_show_unauthorized_as_client(
    test_client: TestClient,
    test_appointment: Appointment,
    auth_headers_client
):
    """Test that client cannot mark appointments as no-show."""
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/no-show",
        headers=auth_headers_client
    )
    
    assert response.status_code == 403


def test_cancel_already_completed_appointment(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    test_appointment: Appointment,
    auth_headers_gestor
):
    """Test that completed appointment cannot be cancelled."""
    # First complete the appointment
    test_appointment.status = AppointmentStatus.COMPLETED
    db_session_test.add(test_appointment)
    db_session_test.commit()
    
    cancel_data = {
        "reason": "Trying to cancel completed appointment"
    }
    
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/cancel",
        json=cancel_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 400
    assert "cannot be cancelled" in response.json()["detail"]


def test_complete_already_cancelled_appointment(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    test_appointment: Appointment,
    auth_headers_professional
):
    """Test that cancelled appointment cannot be completed."""
    # First cancel the appointment
    test_appointment.status = AppointmentStatus.CANCELLED
    db_session_test.add(test_appointment)
    db_session_test.commit()
    
    response = test_client.patch(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}/complete",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 400
    assert "cannot be completed" in response.json()["detail"]


# === AUTHORIZATION TESTS ===

def test_unauthorized_access_without_token(
    test_client: TestClient,
    test_appointment: Appointment
):
    """Test unauthorized access without authentication token."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/{test_appointment.id}"
    )
    
    assert response.status_code == 401


def test_client_cannot_view_other_appointments(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    professional_user_test: UserTenantModel,
    test_service: Service,
    auth_headers_client
):
    """Test that client cannot view appointments of other clients."""
    # Create another client and their appointment
    hashed_password = get_password_hash("testpassword")
    another_client = UserTenantModel(
        id=str(uuid4()),  # Convert to string for SQLite
        tenant_id=default_tenant_test.id,
        email="another.client@example.com",
        hashed_password=hashed_password,
        role=UserRole.CLIENTE,
        full_name="Another Client",
        is_active=True
    )
    db_session_test.add(another_client)
    
    another_appointment = Appointment(
        id=str(uuid4()),  # Convert to string for SQLite
        client_id=another_client.id,
        professional_id=professional_user_test.id,
        service_id=test_service.id,
        tenant_id=default_tenant_test.id,
        appointment_date=date.today() + timedelta(days=1),
        start_time=time(15, 0),
        end_time=time(15, 30),
        status=AppointmentStatus.SCHEDULED,
        price_at_booking=Decimal("25.00"),
        paid_manually=False
    )
    db_session_test.add(another_appointment)
    db_session_test.commit()
    
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/appointments/{another_appointment.id}",
        headers=auth_headers_client
    )
    
    assert response.status_code == 403