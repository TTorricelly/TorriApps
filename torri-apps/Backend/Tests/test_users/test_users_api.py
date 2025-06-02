from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as SQLAlchemySession
from uuid import UUID, uuid4
import pytest

from Backend.Config.Settings import settings as app_settings
from Backend.Core.Auth.constants import UserRole
from Backend.Modules.Tenants.models import Tenant as TenantModel
from Backend.Core.Auth.models import UserTenant as UserTenantModel
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


# Test CREATE USER endpoint
def test_create_user_success_as_gestor(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    auth_headers_gestor
):
    """Test successful user creation by gestor."""
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "role": "PROFISSIONAL",
        "full_name": "New Professional User"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/users/",
        json=user_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["email"] == user_data["email"]
    assert response_data["role"] == user_data["role"]
    assert response_data["full_name"] == user_data["full_name"]
    assert response_data["is_active"] is True
    assert "id" in response_data
    assert "hashed_password" not in response_data  # Password should not be returned


def test_create_user_failure_professional_unauthorized(
    test_client: TestClient,
    auth_headers_professional
):
    """Test that professional cannot create users."""
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "role": "CLIENTE",
        "full_name": "New Client User"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/users/",
        json=user_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


def test_create_user_failure_email_already_exists(
    test_client: TestClient,
    default_tenant_test: TenantModel,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test user creation failure when email already exists."""
    user_data = {
        "email": professional_user_test.email,  # Existing email
        "password": "newpassword123",
        "role": "CLIENTE",
        "full_name": "Duplicate Email User"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/users/",
        json=user_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]


def test_create_user_failure_invalid_role(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test user creation failure with invalid role."""
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "role": "INVALID_ROLE",
        "full_name": "Invalid Role User"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/users/",
        json=user_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 422  # Validation error


# Test GET CURRENT USER endpoint
def test_get_current_user_success(
    test_client: TestClient,
    gestor_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test getting current user details."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/me",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["email"] == gestor_user_test.email
    assert response_data["role"] == gestor_user_test.role.value
    assert response_data["full_name"] == gestor_user_test.full_name
    assert response_data["id"] == str(gestor_user_test.id)


def test_get_current_user_unauthorized(test_client: TestClient):
    """Test getting current user without authentication."""
    response = test_client.get(f"{app_settings.API_V1_PREFIX}/users/me")
    
    assert response.status_code == 401


# Test GET ALL USERS endpoint
def test_get_all_users_success_as_gestor(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    gestor_user_test: UserTenantModel,
    professional_user_test: UserTenantModel,
    client_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test getting all users in tenant as gestor."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 3  # gestor, professional, client
    
    emails = [user["email"] for user in response_data]
    assert gestor_user_test.email in emails
    assert professional_user_test.email in emails
    assert client_user_test.email in emails


def test_get_all_users_failure_professional_unauthorized(
    test_client: TestClient,
    auth_headers_professional
):
    """Test that professional cannot get all users."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


def test_get_all_users_pagination(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test user list pagination."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/?skip=0&limit=1",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 1


# Test GET USER BY ID endpoint
def test_get_user_by_id_success(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test getting user by ID as gestor."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == str(professional_user_test.id)
    assert response_data["email"] == professional_user_test.email


def test_get_user_by_id_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test getting non-existent user by ID."""
    non_existent_id = uuid4()
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]


def test_get_user_by_id_unauthorized_professional(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_professional
):
    """Test that professional cannot get user by ID."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


# Test UPDATE USER endpoint
def test_update_user_success(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful user update by gestor."""
    update_data = {
        "full_name": "Updated Professional Name",
        "role": "ATENDENTE"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["full_name"] == update_data["full_name"]
    assert response_data["role"] == update_data["role"]
    assert response_data["email"] == professional_user_test.email  # Unchanged


def test_update_user_email_success(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful email update."""
    update_data = {
        "email": "updated.professional@example.com"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["email"] == update_data["email"]


def test_update_user_email_conflict(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    client_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test email update failure when email already exists."""
    update_data = {
        "email": client_user_test.email  # Already exists
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"]


def test_update_user_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test updating non-existent user."""
    non_existent_id = uuid4()
    update_data = {
        "full_name": "Updated Name"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/users/{non_existent_id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


def test_update_user_unauthorized_professional(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_professional
):
    """Test that professional cannot update users."""
    update_data = {
        "full_name": "Updated Name"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        json=update_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


# Test DELETE USER endpoint
def test_delete_user_success(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful user deletion by gestor."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204
    
    # Verify user is deleted
    get_response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        headers=auth_headers_gestor
    )
    assert get_response.status_code == 404


def test_delete_user_self_forbidden(
    test_client: TestClient,
    gestor_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test that gestor cannot delete themselves."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/users/{gestor_user_test.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 403
    assert "cannot delete themselves" in response.json()["detail"]


def test_delete_user_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test deleting non-existent user."""
    non_existent_id = uuid4()
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/users/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


def test_delete_user_unauthorized_professional(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_professional
):
    """Test that professional cannot delete users."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/users/{professional_user_test.id}",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403