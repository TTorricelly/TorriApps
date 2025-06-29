"""
Multi-tenant database session management.

This module provides database session management with support for:
- Public schema access (tenants table, authentication, etc.)
- Tenant schema access (business data per tenant)
- Dynamic schema switching based on tenant context
"""

import logging
import time
from typing import Optional, Generator
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from threading import local

from Config.Settings import settings

logger = logging.getLogger(__name__)

# Thread-local storage for tenant context
_tenant_context = local()


class TenantContext:
    """Manages tenant context for the current request"""
    
    @staticmethod
    def set_tenant_schema(schema_name: str) -> None:
        """Set the current tenant schema for this thread"""
        _tenant_context.current_schema = schema_name
        logger.debug(f"Set tenant context to schema: {schema_name}")
    
    @staticmethod
    def get_tenant_schema() -> Optional[str]:
        """Get the current tenant schema for this thread"""
        return getattr(_tenant_context, 'current_schema', None)
    
    @staticmethod
    def clear_tenant_context() -> None:
        """Clear the tenant context for this thread"""
        if hasattr(_tenant_context, 'current_schema'):
            delattr(_tenant_context, 'current_schema')
        logger.debug("Cleared tenant context")
    
    @staticmethod
    def is_tenant_context_set() -> bool:
        """Check if tenant context is set"""
        return hasattr(_tenant_context, 'current_schema')


# Database connection configuration
connect_args = {}
if settings.database_url.startswith('postgresql://'):
    # Configure SSL based on connection type
    if '/cloudsql/' in settings.database_url:
        ssl_mode = "disable"
    elif 'localhost' in settings.database_url or '127.0.0.1' in settings.database_url:
        ssl_mode = "prefer"
    else:
        ssl_mode = "require"
    
    connect_args = {
        "sslmode": ssl_mode,
        "connect_timeout": 60,
        "application_name": "torriapps-backend-multitenant",
        "keepalives_idle": 60,
        "keepalives_interval": 5,
        "keepalives_count": 20,
        "tcp_user_timeout": 300000,
        "options": "-c statement_timeout=300000",
    }

# Create engine for public schema (tenant management, auth, etc.)
public_engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=900,
    pool_size=5,  # Larger pool for public schema
    max_overflow=10,
    pool_reset_on_return='commit',
    pool_timeout=180,
    echo=False,
    connect_args=connect_args
)

# Session factory for public schema
PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_engine)

# Cache for tenant engines (schema_name -> engine)
_tenant_engines: dict[str, Engine] = {}


def _get_tenant_engine(schema_name: str) -> Engine:
    """Get or create an engine for a specific tenant schema"""
    if schema_name not in _tenant_engines:
        logger.info(f"Creating engine for tenant schema: {schema_name}")
        
        # Create tenant-specific engine
        tenant_engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_recycle=900,
            pool_size=2,  # Smaller pool per tenant
            max_overflow=5,
            pool_reset_on_return='commit',
            pool_timeout=180,
            echo=False,
            connect_args=connect_args
        )
        
        # Set up search path for this engine
        from sqlalchemy import event
        
        @event.listens_for(tenant_engine, "connect")
        def set_search_path(dbapi_connection, connection_record):
            with dbapi_connection.cursor() as cursor:
                cursor.execute(f"SET search_path TO {schema_name}, public")
                logger.debug(f"Set search_path to: {schema_name}, public")
        
        @event.listens_for(tenant_engine, "checkout")
        def set_search_path_on_checkout(dbapi_connection, connection_record, connection_proxy):
            with dbapi_connection.cursor() as cursor:
                cursor.execute(f"SET search_path TO {schema_name}, public")
        
        _tenant_engines[schema_name] = tenant_engine
    
    return _tenant_engines[schema_name]


def _get_session_with_retry(session_factory, max_retries: int = 3) -> Generator[Session, None, None]:
    """Create a database session with retry logic"""
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            session = session_factory()
            # Test the connection immediately
            session.execute(text("SELECT 1"))
            try:
                yield session
                break
            finally:
                session.close()
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                raise
            time.sleep(retry_delay)
            retry_delay *= 2


def get_public_db() -> Generator[Session, None, None]:
    """Get a database session for the public schema"""
    yield from _get_session_with_retry(PublicSessionLocal)


def get_tenant_db(schema_name: str) -> Generator[Session, None, None]:
    """Get a database session for a specific tenant schema"""
    tenant_engine = _get_tenant_engine(schema_name)
    TenantSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
    yield from _get_session_with_retry(TenantSessionLocal)


def get_db() -> Generator[Session, None, None]:
    """
    Get a database session based on current tenant context.
    
    This is the main dependency that should be used in FastAPI routes.
    It automatically returns either a public or tenant session based on context.
    """
    tenant_schema = TenantContext.get_tenant_schema()
    
    if tenant_schema:
        # We're in a tenant context, return tenant session
        logger.debug(f"Returning tenant session for schema: {tenant_schema}")
        yield from get_tenant_db(tenant_schema)
    else:
        # No tenant context, return public session
        logger.debug("Returning public session (no tenant context)")
        yield from get_public_db()


@contextmanager
def tenant_session(schema_name: str):
    """
    Context manager for temporary tenant session.
    
    Usage:
        with tenant_session("tenant_abc123") as session:
            # Use session with tenant_abc123 schema
            users = session.query(User).all()
    """
    original_schema = TenantContext.get_tenant_schema()
    try:
        TenantContext.set_tenant_schema(schema_name)
        with next(get_tenant_db(schema_name)) as session:
            yield session
    finally:
        if original_schema:
            TenantContext.set_tenant_schema(original_schema)
        else:
            TenantContext.clear_tenant_context()


def cleanup_tenant_engines():
    """Clean up all tenant engines (useful for tests or shutdown)"""
    global _tenant_engines
    for schema_name, engine in _tenant_engines.items():
        logger.info(f"Disposing engine for schema: {schema_name}")
        engine.dispose()
    _tenant_engines.clear()

