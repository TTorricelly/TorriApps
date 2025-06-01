"""
Tenant Migration Module

This module provides functionality for creating and migrating tenant schemas
in a multi-tenant application using Alembic.
"""

from .service import create_schema_and_migrate, migrate_all

__all__ = ["create_schema_and_migrate", "migrate_all"]