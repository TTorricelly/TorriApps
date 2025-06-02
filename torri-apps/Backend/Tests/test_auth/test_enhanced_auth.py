"""
Tests for enhanced authentication functionality.
"""
import pytest
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from Core.Auth.services import discover_tenant_by_email, enhanced_authenticate_user
from Core.Auth.models import UserTenant
from Modules.Tenants.models import Tenant


class TestTenantDiscovery:
    """Test tenant discovery functionality."""
    
    def test_discover_tenant_by_email_single_match(self, db_session: Session, sample_tenant: Tenant, sample_user: UserTenant):
        """Test discovering tenant when email exists in exactly one tenant."""
        # The fixtures should create a sample user in a sample tenant
        found_tenant_ids = discover_tenant_by_email(db_session, sample_user.email)
        
        assert len(found_tenant_ids) == 1
        assert found_tenant_ids[0] == sample_user.tenant_id

    def test_discover_tenant_by_email_not_found(self, db_session: Session):
        """Test discovering tenant when email doesn't exist in any tenant."""
        nonexistent_email = "nonexistent@example.com"
        found_tenant_ids = discover_tenant_by_email(db_session, nonexistent_email)
        
        assert len(found_tenant_ids) == 0

    def test_enhanced_authenticate_with_tenant_id(self, db_session: Session, sample_user: UserTenant):
        """Test enhanced authentication when tenant_id is provided."""
        user, error = enhanced_authenticate_user(
            db_session,
            email=sample_user.email,
            password="testpassword123",  # Assuming this is the password used in fixtures
            tenant_id=sample_user.tenant_id
        )
        
        assert user is not None
        assert error is None
        assert user.email == sample_user.email

    def test_enhanced_authenticate_without_tenant_id(self, db_session: Session, sample_user: UserTenant):
        """Test enhanced authentication when tenant_id is not provided (discovery mode)."""
        user, error = enhanced_authenticate_user(
            db_session,
            email=sample_user.email,
            password="testpassword123",  # Assuming this is the password used in fixtures
            tenant_id=None
        )
        
        assert user is not None
        assert error is None
        assert user.email == sample_user.email

    def test_enhanced_authenticate_email_not_found(self, db_session: Session):
        """Test enhanced authentication with non-existent email."""
        user, error = enhanced_authenticate_user(
            db_session,
            email="nonexistent@example.com",
            password="testpassword123",
            tenant_id=None
        )
        
        assert user is None
        assert error == "Email not found."

    def test_enhanced_authenticate_wrong_password(self, db_session: Session, sample_user: UserTenant):
        """Test enhanced authentication with wrong password."""
        user, error = enhanced_authenticate_user(
            db_session,
            email=sample_user.email,
            password="wrongpassword",
            tenant_id=None
        )
        
        assert user is None
        assert error == "Incorrect password."


class TestEnhancedAuthAPI:
    """Test enhanced authentication API endpoints."""
    
    def test_enhanced_login_with_tenant_id(self, client: TestClient, sample_user: UserTenant):
        """Test enhanced login API with tenant_id provided."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": sample_user.email,
            "password": "testpassword123",
            "tenant_id": str(sample_user.tenant_id)
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "tenant_id" in data
        assert data["tenant_id"] == str(sample_user.tenant_id)

    def test_enhanced_login_without_tenant_id(self, client: TestClient, sample_user: UserTenant):
        """Test enhanced login API without tenant_id (discovery mode)."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": sample_user.email,
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "tenant_id" in data
        assert data["tenant_id"] == str(sample_user.tenant_id)

    def test_enhanced_login_email_not_found(self, client: TestClient):
        """Test enhanced login API with non-existent email."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": "nonexistent@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "Email not found" in data["detail"]

    def test_enhanced_login_wrong_password(self, client: TestClient, sample_user: UserTenant):
        """Test enhanced login API with wrong password."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": sample_user.email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Incorrect password" in data["detail"]

    def test_enhanced_login_invalid_email_format(self, client: TestClient):
        """Test enhanced login API with invalid email format."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": "invalid-email",
            "password": "testpassword123"
        })
        
        assert response.status_code == 422  # Validation error

    def test_enhanced_login_missing_fields(self, client: TestClient):
        """Test enhanced login API with missing required fields."""
        response = client.post("/api/v1/auth/enhanced-login", json={
            "email": "test@example.com"
            # Missing password
        })
        
        assert response.status_code == 422  # Validation error