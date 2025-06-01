import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session as SQLAlchemySession # Renamed to avoid conflict
from typing import Generator
from uuid import uuid4, UUID

# Import FastAPI app and Base metadata for public and tenant schemas
# Assuming PYTHONPATH is set up for 'Backend' or tests are run from a context where 'Backend' is discoverable.
from Backend.main import app
from Backend.Config.Database import Base, BasePublic # Base for tenant, BasePublic for public schema
from Backend.Config.Settings import settings as app_settings # Renamed to avoid conflict with pytest 'settings'
from Backend.Core.Database.dependencies import get_db

# Import models for creating test data
from Backend.Modules.Tenants.models import Tenant as TenantModel
from Backend.Modules.AdminMaster.models import AdminMasterUser as AdminMasterUserModel, AdminMasterRole
from Backend.Core.Auth.models import UserTenant as UserTenantModel
from Backend.Core.Auth.constants import UserRole
from Backend.Core.Security.hashing import get_password_hash

# Test Database Configuration (SQLite in-memory for simplicity)
SQLALCHEMY_DATABASE_URL_TEST = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL_TEST,
    connect_args={"check_same_thread": False}  # Required for SQLite usage in FastAPI/multiple threads
)

# This is to enable foreign key constraints for SQLite in-memory, as they are off by default.
# It's important for testing relationships and cascade deletions.
@event.listens_for(engine_test, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="session", autouse=True)
def create_test_tables() -> Generator[None, None, None]:
    """
    Creates all tables once per test session and drops them afterwards.
    """
    # Create tables for the public schema (e.g., tenants, admin_master_users)
    BasePublic.metadata.create_all(bind=engine_test)
    # Create tables for the tenant-specific schema (e.g., users_tenant, services, appointments)
    # In SQLite, these will all be in the same "file" (memory), but Alembic handles schema for real DBs.
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    BasePublic.metadata.drop_all(bind=engine_test)

@pytest.fixture(scope="function")
def db_session_test() -> Generator[SQLAlchemySession, None, None]:
    """
    Provides a transactional database session for each test function.
    Rolls back transactions to ensure test isolation.
    """
    connection = engine_test.connect()
    transaction = connection.begin()
    session = SessionTesting(bind=connection)

    # The `begin_nested()` ensures that if the application code calls session.commit(),
    # it commits to this nested transaction, which is then rolled back at the end of the test.
    # This is crucial if your service layer has explicit commits.
    nested_transaction = session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def end_savepoint(session, transaction):
        nonlocal nested_transaction
        if not nested_transaction.is_active:
            nested_transaction = session.begin_nested()

    yield session

    session.close()
    transaction.rollback() # Rollback the outer transaction
    connection.close()


@pytest.fixture(scope="function")
def test_client(db_session_test: SQLAlchemySession) -> Generator[TestClient, None, None]:
    """
    Provides a TestClient instance with the get_db dependency overridden
    to use the test database session.
    """
    def override_get_db() -> Generator[SQLAlchemySession, None, None]:
        # This will use the session provided by db_session_test fixture,
        # which is already within a transaction.
        try:
            yield db_session_test
        finally:
            # The session is managed (closed, rolled back) by the db_session_test fixture.
            # No db_session_test.close() here.
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    del app.dependency_overrides[get_db] # Clean up the override


# --- Data Fixtures ---

@pytest.fixture(scope="function")
def default_tenant_db_schema_name_test() -> str:
    """Provides a unique dummy schema name for a test tenant."""
    # For SQLite, this is just a conceptual name; no actual schema switching occurs.
    return f"tenant_test_{uuid4().hex[:8]}"

@pytest.fixture(scope="function")
def default_tenant_test(db_session_test: SQLAlchemySession, default_tenant_db_schema_name_test: str) -> TenantModel:
    """Creates a default tenant in the public schema for testing."""
    tenant = TenantModel(
        id=uuid4(), # Explicitly set UUID for predictability if needed, or let default work
        name="Default Test Tenant",
        slug=f"default-test-tenant-{uuid4().hex[:6]}",
        db_schema_name=default_tenant_db_schema_name_test, # Actual schema name for multi-tenant DBs
        block_size_minutes=30
    )
    db_session_test.add(tenant)
    db_session_test.commit() # Commit to make it available for other fixtures/tests
    db_session_test.refresh(tenant)
    return tenant

@pytest.fixture(scope="function")
def gestor_user_test(db_session_test: SQLAlchemySession, default_tenant_test: TenantModel) -> UserTenantModel:
    """Creates a GESTOR user within the default_tenant_test for authentication tests."""
    hashed_password = get_password_hash("testpassword")
    user = UserTenantModel(
        id=uuid4(),
        tenant_id=default_tenant_test.id, # Link to the created tenant
        email="gestor.test@example.com",
        hashed_password=hashed_password,
        role=UserRole.GESTOR,
        full_name="Gestor Test User",
        is_active=True
    )
    db_session_test.add(user)
    db_session_test.commit()
    db_session_test.refresh(user)
    return user

# Add more fixtures as needed (e.g., professional_user_test, client_user_test, services, etc.)
