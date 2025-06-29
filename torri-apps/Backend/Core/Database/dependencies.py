"""
Database dependencies for FastAPI.

This module provides the database session dependencies that are used
throughout the FastAPI application. It imports from the session module
which handles multi-tenant database session management.
"""

# Import all session management functions from the session module
from .session import (
    get_db,
    get_public_db, 
    get_tenant_db,
    TenantContext,
    tenant_session,
    cleanup_tenant_engines
)

# Re-export for compatibility
__all__ = [
    'get_db',
    'get_public_db', 
    'get_tenant_db',
    'TenantContext',
    'tenant_session',
    'cleanup_tenant_engines'
]
