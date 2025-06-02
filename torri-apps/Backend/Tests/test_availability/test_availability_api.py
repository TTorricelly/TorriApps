from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as SQLAlchemySession
from uuid import UUID, uuid4
import pytest
from datetime import time, date, timedelta

from Backend.Config.Settings import settings as app_settings
from Backend.Core.Auth.constants import UserRole
from Backend.Modules.Tenants.models import Tenant as TenantModel
from Backend.Core.Auth.models import UserTenant as UserTenantModel
from Backend.Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Backend.Modules.Availability.constants import DayOfWeek, AvailabilityBlockType
from Backend.Core.Security.hashing import get_password_hash


@pytest.fixture(scope="function")
def professional_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates a PROFESSIONAL user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=uuid4(),
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
def another_professional_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates another PROFESSIONAL user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=uuid4(),
        tenant_id=default_tenant_test.id,
        email="another.professional@example.com",
        hashed_password=hashed_password,
        role=UserRole.PROFISSIONAL,
        full_name="Another Professional User",
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
        id=uuid4(),
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
def test_availability_slot(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, professional_user_test: UserTenantModel) -> ProfessionalAvailability:
    """Creates a test availability slot."""
    slot = ProfessionalAvailability(
        id=uuid4(),
        professional_user_id=professional_user_test.id,
        tenant_id=default_tenant_test.id,
        day_of_week=DayOfWeek.MONDAY,
        start_time=time(9, 0),
        end_time=time(12, 0)
    )
    db_session_test.add(slot)
    db_session_test.commit()
    db_session_test.refresh(slot)
    return slot


@pytest.fixture(scope="function")
def test_break(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, professional_user_test: UserTenantModel) -> ProfessionalBreak:
    """Creates a test break."""
    break_obj = ProfessionalBreak(
        id=uuid4(),
        professional_user_id=professional_user_test.id,
        tenant_id=default_tenant_test.id,
        day_of_week=DayOfWeek.MONDAY,
        start_time=time(12, 0),
        end_time=time(13, 0),
        name="Lunch Break"
    )
    db_session_test.add(break_obj)
    db_session_test.commit()
    db_session_test.refresh(break_obj)
    return break_obj


@pytest.fixture(scope="function")
def test_blocked_time(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel, professional_user_test: UserTenantModel) -> ProfessionalBlockedTime:
    """Creates a test blocked time."""
    blocked_time = ProfessionalBlockedTime(
        id=uuid4(),
        professional_user_id=professional_user_test.id,
        tenant_id=default_tenant_test.id,
        block_date=date.today() + timedelta(days=1),
        start_time=time(14, 0),
        end_time=time(15, 0),
        block_type=AvailabilityBlockType.BLOCKED_SLOT,
        reason="Doctor appointment"
    )
    db_session_test.add(blocked_time)
    db_session_test.commit()
    db_session_test.refresh(blocked_time)
    return blocked_time


# === PROFESSIONAL AVAILABILITY SLOTS TESTS ===

def test_create_availability_slot_success_as_gestor(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful availability slot creation by gestor."""
    slot_data = {
        "day_of_week": DayOfWeek.TUESDAY.value,
        "start_time": "09:00:00",
        "end_time": "17:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        json=slot_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["day_of_week"] == slot_data["day_of_week"]
    assert response_data["start_time"] == slot_data["start_time"]
    assert response_data["end_time"] == slot_data["end_time"]
    assert response_data["professional_user_id"] == str(professional_user_test.id)


def test_create_availability_slot_success_as_professional_self(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_professional
):
    """Test successful availability slot creation by professional for themselves."""
    slot_data = {
        "day_of_week": DayOfWeek.WEDNESDAY.value,
        "start_time": "10:00:00",
        "end_time": "18:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        json=slot_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["day_of_week"] == slot_data["day_of_week"]


def test_create_availability_slot_failure_invalid_time_range(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test availability slot creation failure with invalid time range."""
    slot_data = {
        "day_of_week": DayOfWeek.MONDAY.value,
        "start_time": "17:00:00",
        "end_time": "09:00:00"  # End before start
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        json=slot_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 422  # Validation error


def test_create_availability_slot_unauthorized_client(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_client
):
    """Test that client cannot create availability slots."""
    slot_data = {
        "day_of_week": DayOfWeek.MONDAY.value,
        "start_time": "09:00:00",
        "end_time": "17:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        json=slot_data,
        headers=auth_headers_client
    )
    
    assert response.status_code == 403


def test_create_availability_slot_professional_managing_other(
    test_client: TestClient,
    another_professional_user_test: UserTenantModel,
    auth_headers_professional
):
    """Test that professional cannot manage another professional's availability."""
    slot_data = {
        "day_of_week": DayOfWeek.MONDAY.value,
        "start_time": "09:00:00",
        "end_time": "17:00:00"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{another_professional_user_test.id}/slots",
        json=slot_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


def test_get_availability_slots_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful availability slots retrieval."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    slot_ids = [slot["id"] for slot in response_data]
    assert str(test_availability_slot.id) in slot_ids


def test_get_availability_slots_filtered_by_day(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test availability slots retrieval filtered by day of week."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots?day_of_week={DayOfWeek.MONDAY.value}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    for slot in response_data:
        assert slot["day_of_week"] == DayOfWeek.MONDAY.value


def test_get_availability_slots_non_existent_professional(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test availability slots retrieval for non-existent professional."""
    non_existent_id = uuid4()
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{non_existent_id}/slots",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_delete_availability_slot_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_gestor
):
    """Test successful availability slot deletion."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots/{test_availability_slot.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204


def test_delete_availability_slot_not_found(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test deleting non-existent availability slot."""
    non_existent_id = uuid4()
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


# === PROFESSIONAL BREAKS TESTS ===

def test_create_break_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful break creation."""
    break_data = {
        "day_of_week": DayOfWeek.FRIDAY.value,
        "start_time": "12:00:00",
        "end_time": "13:00:00",
        "name": "Lunch Break"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/breaks",
        json=break_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["day_of_week"] == break_data["day_of_week"]
    assert response_data["start_time"] == break_data["start_time"]
    assert response_data["end_time"] == break_data["end_time"]
    assert response_data["name"] == break_data["name"]


def test_create_break_invalid_time_range(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test break creation failure with invalid time range."""
    break_data = {
        "day_of_week": DayOfWeek.FRIDAY.value,
        "start_time": "13:00:00",
        "end_time": "12:00:00",  # End before start
        "name": "Invalid Break"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/breaks",
        json=break_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 422


def test_get_breaks_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_break: ProfessionalBreak,
    auth_headers_gestor
):
    """Test successful breaks retrieval."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/breaks",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    break_ids = [break_obj["id"] for break_obj in response_data]
    assert str(test_break.id) in break_ids


def test_get_breaks_filtered_by_day(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_break: ProfessionalBreak,
    auth_headers_gestor
):
    """Test breaks retrieval filtered by day of week."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/breaks?day_of_week={DayOfWeek.MONDAY.value}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    for break_obj in response_data:
        assert break_obj["day_of_week"] == DayOfWeek.MONDAY.value


def test_delete_break_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_break: ProfessionalBreak,
    auth_headers_gestor
):
    """Test successful break deletion."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/breaks/{test_break.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204


# === PROFESSIONAL BLOCKED TIMES TESTS ===

def test_create_blocked_time_slot_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful blocked time slot creation."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    blocked_time_data = {
        "block_date": tomorrow,
        "start_time": "14:00:00",
        "end_time": "15:00:00",
        "block_type": AvailabilityBlockType.BLOCKED_SLOT.value,
        "reason": "Medical appointment"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times",
        json=blocked_time_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["block_date"] == blocked_time_data["block_date"]
    assert response_data["start_time"] == blocked_time_data["start_time"]
    assert response_data["end_time"] == blocked_time_data["end_time"]
    assert response_data["block_type"] == blocked_time_data["block_type"]
    assert response_data["reason"] == blocked_time_data["reason"]


def test_create_day_off_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful day off creation."""
    tomorrow = (date.today() + timedelta(days=2)).isoformat()
    day_off_data = {
        "block_date": tomorrow,
        "block_type": AvailabilityBlockType.DAY_OFF.value,
        "reason": "Personal day"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times",
        json=day_off_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["block_date"] == day_off_data["block_date"]
    assert response_data["block_type"] == day_off_data["block_type"]
    assert response_data["start_time"] is None
    assert response_data["end_time"] is None


def test_create_day_off_with_times_invalid(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test day off creation failure when times are provided."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    invalid_day_off_data = {
        "block_date": tomorrow,
        "start_time": "09:00:00",  # Should not be provided for DAY_OFF
        "end_time": "17:00:00",   # Should not be provided for DAY_OFF
        "block_type": AvailabilityBlockType.DAY_OFF.value,
        "reason": "Personal day"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times",
        json=invalid_day_off_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 422  # Validation error


def test_create_blocked_slot_without_times_invalid(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test blocked slot creation failure when times are missing."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    invalid_blocked_slot_data = {
        "block_date": tomorrow,
        "block_type": AvailabilityBlockType.BLOCKED_SLOT.value,
        "reason": "Meeting"
        # Missing start_time and end_time
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times",
        json=invalid_blocked_slot_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 422  # Validation error


def test_get_blocked_times_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_blocked_time: ProfessionalBlockedTime,
    auth_headers_gestor
):
    """Test successful blocked times retrieval."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    blocked_time_ids = [bt["id"] for bt in response_data]
    assert str(test_blocked_time.id) in blocked_time_ids


def test_get_blocked_times_with_date_filter(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_blocked_time: ProfessionalBlockedTime,
    auth_headers_gestor
):
    """Test blocked times retrieval with date range filter."""
    start_date = date.today().isoformat()
    end_date = (date.today() + timedelta(days=7)).isoformat()
    
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times?start_date={start_date}&end_date={end_date}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    for blocked_time in response_data:
        block_date = date.fromisoformat(blocked_time["block_date"])
        assert date.today() <= block_date <= (date.today() + timedelta(days=7))


def test_delete_blocked_time_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_blocked_time: ProfessionalBlockedTime,
    auth_headers_gestor
):
    """Test successful blocked time deletion."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times/{test_blocked_time.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204


def test_delete_blocked_time_not_found(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test deleting non-existent blocked time."""
    non_existent_id = uuid4()
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/blocked-times/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


# === CROSS-ROLE PERMISSION TESTS ===

def test_professional_can_view_own_availability(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_professional
):
    """Test that professional can view their own availability."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 200


def test_client_can_view_professional_availability(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    test_availability_slot: ProfessionalAvailability,
    auth_headers_client
):
    """Test that client can view professional availability."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots",
        headers=auth_headers_client
    )
    
    assert response.status_code == 200


def test_unauthorized_access_without_token(
    test_client: TestClient,
    professional_user_test: UserTenantModel
):
    """Test unauthorized access without authentication token."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/availability/professional/{professional_user_test.id}/slots"
    )
    
    assert response.status_code == 401