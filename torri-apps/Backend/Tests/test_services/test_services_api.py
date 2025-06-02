from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as SQLAlchemySession
from uuid import UUID, uuid4
import pytest
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
from Core.Security.hashing import get_password_hash


@pytest.fixture(scope="function")
def professional_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates a PROFESSIONAL user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=str(uuid4()),
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
def atendente_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates an ATENDENTE user within the default_tenant_test for testing."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=str(uuid4()),
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
        id=str(uuid4()),
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
        id=str(uuid4()),
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


# === CATEGORY TESTS ===

def test_create_category_success(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test successful category creation by gestor."""
    category_data = {
        "name": "Hair Services"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/categories",
        json=category_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["name"] == category_data["name"]
    assert "id" in response_data
    assert "tenant_id" in response_data


def test_create_category_duplicate_name(
    test_client: TestClient,
    test_category: Category,
    auth_headers_gestor
):
    """Test category creation failure with duplicate name."""
    category_data = {
        "name": test_category.name
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/categories",
        json=category_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_create_category_unauthorized_professional(
    test_client: TestClient,
    auth_headers_professional
):
    """Test that professional cannot create categories."""
    category_data = {
        "name": "Hair Services"
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/categories",
        json=category_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


def test_list_categories_success(
    test_client: TestClient,
    test_category: Category,
    auth_headers_gestor
):
    """Test successful category listing by gestor."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/categories",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    category_names = [cat["name"] for cat in response_data]
    assert test_category.name in category_names


def test_list_categories_pagination(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test category listing with pagination."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/categories?skip=0&limit=1",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) <= 1


def test_get_category_by_id_success(
    test_client: TestClient,
    test_category: Category,
    auth_headers_gestor
):
    """Test successful category retrieval by ID."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/categories/{test_category.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == str(test_category.id)
    assert response_data["name"] == test_category.name


def test_get_category_by_id_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test category retrieval with non-existent ID."""
    non_existent_id = str(uuid4())
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/categories/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_category_success(
    test_client: TestClient,
    test_category: Category,
    auth_headers_gestor
):
    """Test successful category update."""
    update_data = {
        "name": "Updated Category Name"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/categories/{test_category.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["name"] == update_data["name"]
    assert response_data["id"] == str(test_category.id)


def test_update_category_duplicate_name(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    test_category: Category,
    auth_headers_gestor
):
    """Test category update failure with duplicate name."""
    # Create another category
    another_category = Category(
        id=str(uuid4()),
        name="Another Category",
        tenant_id=default_tenant_test.id
    )
    db_session_test.add(another_category)
    db_session_test.commit()
    
    update_data = {
        "name": another_category.name
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/categories/{test_category.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_delete_category_success(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    auth_headers_gestor
):
    """Test successful category deletion."""
    # Create a category without services
    category = Category(
        id=str(uuid4()),
        name="To Delete Category",
        tenant_id=default_tenant_test.id
    )
    db_session_test.add(category)
    db_session_test.commit()
    
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/categories/{category.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204


def test_delete_category_with_services_failure(
    test_client: TestClient,
    test_category: Category,
    test_service: Service,
    auth_headers_gestor
):
    """Test category deletion failure when it has associated services."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/categories/{test_category.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "associated service" in response.json()["detail"]


def test_delete_category_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test deleting non-existent category."""
    non_existent_id = str(uuid4())
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/categories/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


# === SERVICE TESTS ===

def test_create_service_success(
    test_client: TestClient,
    test_category: Category,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful service creation by gestor."""
    service_data = {
        "name": "Premium Haircut",
        "description": "Premium haircut service",
        "duration_minutes": 45,
        "price": 35.00,
        "commission_percentage": 15.00,
        "category_id": str(test_category.id),
        "professional_ids": [str(professional_user_test.id)]
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/services",
        json=service_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["name"] == service_data["name"]
    assert response_data["duration_minutes"] == service_data["duration_minutes"]
    assert float(response_data["price"]) == service_data["price"]
    assert len(response_data["professionals"]) == 1
    assert response_data["professionals"][0]["id"] == str(professional_user_test.id)


def test_create_service_invalid_category(
    test_client: TestClient,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test service creation failure with invalid category."""
    service_data = {
        "name": "Premium Haircut",
        "description": "Premium haircut service",
        "duration_minutes": 45,
        "price": 35.00,
        "commission_percentage": 15.00,
        "category_id": str(uuid4()),  # Non-existent category
        "professional_ids": [str(professional_user_test.id)]
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/services",
        json=service_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 400
    assert "Category" in response.json()["detail"]


def test_create_service_invalid_professional(
    test_client: TestClient,
    test_category: Category,
    auth_headers_gestor
):
    """Test service creation failure with invalid professional."""
    service_data = {
        "name": "Premium Haircut",
        "description": "Premium haircut service",
        "duration_minutes": 45,
        "price": 35.00,
        "commission_percentage": 15.00,
        "category_id": str(test_category.id),
        "professional_ids": [str(uuid4())]  # Non-existent professional
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/services",
        json=service_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 400
    assert "Invalid or non-professional" in response.json()["detail"]


def test_create_service_duplicate_name(
    test_client: TestClient,
    test_category: Category,
    test_service: Service,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test service creation failure with duplicate name."""
    service_data = {
        "name": test_service.name,  # Duplicate name
        "description": "Another service",
        "duration_minutes": 45,
        "price": 35.00,
        "commission_percentage": 15.00,
        "category_id": str(test_category.id),
        "professional_ids": [str(professional_user_test.id)]
    }
    
    response = test_client.post(
        f"{app_settings.API_V1_PREFIX}/services",
        json=service_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_list_services_success_gestor(
    test_client: TestClient,
    test_service: Service,
    auth_headers_gestor
):
    """Test successful service listing by gestor."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1
    service_names = [service["name"] for service in response_data]
    assert test_service.name in service_names


def test_list_services_success_professional(
    test_client: TestClient,
    test_service: Service,
    auth_headers_professional
):
    """Test that professional can view services."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1


def test_list_services_success_atendente(
    test_client: TestClient,
    test_service: Service,
    auth_headers_atendente
):
    """Test that atendente can view services."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services",
        headers=auth_headers_atendente
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) >= 1


def test_list_services_filter_by_category(
    test_client: TestClient,
    test_service: Service,
    test_category: Category,
    auth_headers_gestor
):
    """Test service listing filtered by category."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services?category_id={test_category.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    for service in response_data:
        assert service["category"]["id"] == str(test_category.id)


def test_get_service_by_id_success(
    test_client: TestClient,
    test_service: Service,
    auth_headers_gestor
):
    """Test successful service retrieval by ID."""
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services/{test_service.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == str(test_service.id)
    assert response_data["name"] == test_service.name
    assert "category" in response_data
    assert "professionals" in response_data


def test_get_service_by_id_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test service retrieval with non-existent ID."""
    non_existent_id = str(uuid4())
    response = test_client.get(
        f"{app_settings.API_V1_PREFIX}/services/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_service_success(
    test_client: TestClient,
    test_service: Service,
    auth_headers_gestor
):
    """Test successful service update."""
    update_data = {
        "name": "Updated Service Name",
        "price": 45.00
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/services/{test_service.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["name"] == update_data["name"]
    assert float(response_data["price"]) == update_data["price"]


def test_update_service_professionals(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    test_service: Service,
    auth_headers_gestor
):
    """Test updating service professionals."""
    # Create another professional
    hashed_password = get_password_hash("testpassword")
    another_professional = UserTenantModel(
        id=str(uuid4()),
        tenant_id=default_tenant_test.id,
        email="another.professional@example.com",
        hashed_password=hashed_password,
        role=UserRole.PROFISSIONAL,
        full_name="Another Professional",
        is_active=True
    )
    db_session_test.add(another_professional)
    db_session_test.commit()
    
    update_data = {
        "professional_ids": [str(another_professional.id)]
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/services/{test_service.id}",
        json=update_data,
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data["professionals"]) == 1
    assert response_data["professionals"][0]["id"] == str(another_professional.id)


def test_update_service_unauthorized_professional(
    test_client: TestClient,
    test_service: Service,
    auth_headers_professional
):
    """Test that professional cannot update services."""
    update_data = {
        "name": "Updated Service Name"
    }
    
    response = test_client.put(
        f"{app_settings.API_V1_PREFIX}/services/{test_service.id}",
        json=update_data,
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403


def test_delete_service_success(
    test_client: TestClient,
    db_session_test: SQLAlchemySession,
    default_tenant_test: TenantModel,
    test_category: Category,
    professional_user_test: UserTenantModel,
    auth_headers_gestor
):
    """Test successful service deletion."""
    # Create a service to delete
    service = Service(
        id=str(uuid4()),
        name="To Delete Service",
        description="Service to be deleted",
        duration_minutes=30,
        price=Decimal("25.00"),
        category_id=test_category.id,
        tenant_id=default_tenant_test.id
    )
    db_session_test.add(service)
    db_session_test.commit()
    
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/services/{service.id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 204


def test_delete_service_not_found(
    test_client: TestClient,
    auth_headers_gestor
):
    """Test deleting non-existent service."""
    non_existent_id = str(uuid4())
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/services/{non_existent_id}",
        headers=auth_headers_gestor
    )
    
    assert response.status_code == 404


def test_delete_service_unauthorized_professional(
    test_client: TestClient,
    test_service: Service,
    auth_headers_professional
):
    """Test that professional cannot delete services."""
    response = test_client.delete(
        f"{app_settings.API_V1_PREFIX}/services/{test_service.id}",
        headers=auth_headers_professional
    )
    
    assert response.status_code == 403