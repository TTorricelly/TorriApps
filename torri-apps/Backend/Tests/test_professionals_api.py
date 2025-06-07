import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4, UUID # Import UUID for type hinting

from Core.Auth.models import UserTenant # UserRole is in UserTenant.role which is an Enum
from Core.Auth.constants import UserRole # Import UserRole enum
from Modules.Services.models import Service as ServiceModel, Category as CategoryModel
from Modules.Professionals.schemas import Professional as ProfessionalSchema

# Helper function to create a professional directly in the DB for testing
def create_test_professional(db: Session, tenant_id: str, email: str, full_name: str) -> UserTenant:
    from Core.Security.hashing import get_password_hash
    professional = UserTenant(
        id=str(uuid4()),
        tenant_id=tenant_id,
        email=email,
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.PROFISSIONAL,
        full_name=full_name,
        is_active=True
    )
    db.add(professional)
    db.commit()
    db.refresh(professional)
    return professional

# Helper function to create a service category directly
def create_test_category(db: Session, name: str, tenant_id: str) -> CategoryModel:
    category = CategoryModel(id=str(uuid4()), name=name, tenant_id=tenant_id, display_order=0)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# Helper function to create a service directly
def create_test_service(db: Session, name: str, category_id: str, tenant_id: str) -> ServiceModel:
    service = ServiceModel(
        id=str(uuid4()),
        name=name,
        category_id=category_id,
        tenant_id=tenant_id,
        duration_minutes=30,
        price=50.00,
        is_active=True
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

def test_update_professional_services_association(
    client: TestClient, db: Session, gestor_auth_headers: dict
):
    # Get tenant_id from the gestor user created by fixtures
    gestor_user = db.query(UserTenant).filter(UserTenant.email == "gestor@example.com").first()
    assert gestor_user is not None, "Gestor user 'gestor@example.com' not found. Ensure test fixtures create this user."
    assert gestor_user.tenant_id is not None, "Gestor user must have a tenant_id."
    tenant_id = str(gestor_user.tenant_id)

    # Create a professional
    professional = create_test_professional(db, tenant_id=tenant_id, email="prof_services_test@example.com", full_name="Prof Services Test")
    professional_id = str(professional.id)

    # Create a category for the services
    category = create_test_category(db, name="Category for Prof Services Test", tenant_id=tenant_id)
    category_id = str(category.id)

    # Create services
    service1 = create_test_service(db, name="Service Alpha", category_id=category_id, tenant_id=tenant_id)
    service2 = create_test_service(db, name="Service Beta", category_id=category_id, tenant_id=tenant_id)
    service1_id_str = str(service1.id)
    service2_id_str = str(service2.id)

    # 1. Associate one service with the professional
    response = client.put(
        f"/professionals/{professional_id}/services",
        json={"service_ids": [service1_id_str]},
        headers=gestor_auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    associated_services_response = response.json()
    assert len(associated_services_response) == 1
    assert associated_services_response[0]["id"] == service1_id_str

    # Verify by fetching the professional details
    prof_details_response = client.get(f"/professionals/{professional_id}", headers=gestor_auth_headers)
    assert prof_details_response.status_code == status.HTTP_200_OK
    prof_schema = ProfessionalSchema(**prof_details_response.json()) # Validate response against schema
    assert len(prof_schema.services_offered) == 1
    assert prof_schema.services_offered[0].id == service1.id # Compare UUID objects

    # 2. Associate both services
    response = client.put(
        f"/professionals/{professional_id}/services",
        json={"service_ids": [service1_id_str, service2_id_str]},
        headers=gestor_auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    associated_services_response = response.json()
    assert len(associated_services_response) == 2
    service_ids_in_response = {s["id"] for s in associated_services_response}
    assert service_ids_in_response == {service1_id_str, service2_id_str}

    prof_details_response = client.get(f"/professionals/{professional_id}", headers=gestor_auth_headers)
    prof_schema = ProfessionalSchema(**prof_details_response.json())
    assert len(prof_schema.services_offered) == 2
    offered_ids = {str(s.id) for s in prof_schema.services_offered}
    assert offered_ids == {service1_id_str, service2_id_str}

    # 3. Associate only the second service (remove first)
    response = client.put(
        f"/professionals/{professional_id}/services",
        json={"service_ids": [service2_id_str]},
        headers=gestor_auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    associated_services_response = response.json()
    assert len(associated_services_response) == 1
    assert associated_services_response[0]["id"] == service2_id_str

    prof_details_response = client.get(f"/professionals/{professional_id}", headers=gestor_auth_headers)
    prof_schema = ProfessionalSchema(**prof_details_response.json())
    assert len(prof_schema.services_offered) == 1
    assert prof_schema.services_offered[0].id == service2.id

    # 4. Remove all services
    response = client.put(
        f"/professionals/{professional_id}/services",
        json={"service_ids": []},  # Empty list
        headers=gestor_auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    associated_services_response = response.json()
    assert len(associated_services_response) == 0

    prof_details_response = client.get(f"/professionals/{professional_id}", headers=gestor_auth_headers)
    prof_schema = ProfessionalSchema(**prof_details_response.json())
    assert len(prof_schema.services_offered) == 0

    # Clean up test data
    db.delete(service1)
    db.delete(service2)
    db.delete(category)
    db.delete(professional)
    db.commit()
