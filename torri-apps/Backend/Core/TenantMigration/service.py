"""
Tenant Migration Service

Provides functionality for creating tenant schemas and running Alembic migrations
in a multi-tenant application.
"""

import logging
import time
from typing import List, Optional
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from Config.Settings import settings

logger = logging.getLogger(__name__)

# Migration paths
MIGRATIONS_PATH = Path(__file__).parent.parent.parent / "migrations"
ALEMBIC_INI_PATH = MIGRATIONS_PATH.parent / "alembic.ini"


class TenantMigrationError(Exception):
    """Custom exception for tenant migration operations"""
    pass


def _retry_on_error(func, max_retries: int = 3, initial_delay: float = 1.0):
    """
    Retry decorator for database operations with exponential backoff.
    
    Args:
        func: Function to execute
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay between retries in seconds
    """
    def wrapper(*args, **kwargs):
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except (OperationalError, Exception) as e:
                last_exception = e
                if attempt < max_retries:
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {func.__name__}: {e}. "
                        f"Retrying in {delay} seconds..."
                    )
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                else:
                    logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}")
        
        raise last_exception
    
    return wrapper


@_retry_on_error
def create_schema_and_migrate(schema_name: str) -> bool:
    """
    Create tenant schema if it doesn't exist and run Alembic migrations.
    
    Args:
        schema_name: Name of the tenant schema to create/migrate
        
    Returns:
        bool: True if successful, raises exception if failed
        
    Raises:
        TenantMigrationError: If schema creation or migration fails
    """
    try:
        logger.info(f"Starting migration for tenant schema: {schema_name}")
        
        # Step 1: Create schema if it doesn't exist
        logger.info(f"Creating schema '{schema_name}' if not exists")
        public_engine = create_engine(settings.public_database_url)
        
        with public_engine.connect() as conn:
            # For PostgreSQL, create schema if not exists (no backticks needed)
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
            logger.info(f"Schema '{schema_name}' creation completed")
        
        public_engine.dispose()
        
        # Step 2: Run Alembic migrations for tenant schema
        logger.info(f"Running Alembic migrations for schema: {schema_name}")
        
        # Configure Alembic for tenant migration
        alembic_cfg = AlembicConfig(str(ALEMBIC_INI_PATH))
        alembic_cfg.set_main_option("script_location", str(MIGRATIONS_PATH))
        
        # Set tenant-specific database URL
        tenant_url = settings.tenant_url_template.format(schema=schema_name)
        alembic_cfg.set_main_option("sqlalchemy.url", tenant_url)
        
        # Configure for tenant metadata and schema
        alembic_cfg.set_main_option("version_table_schema", schema_name)
        alembic_cfg.set_main_option("metadata_choice", "tenant")
        
        # Run the migration
        command.upgrade(alembic_cfg, "head")
        
        logger.info(f"Successfully completed migration for schema: {schema_name}")
        return True
        
    except Exception as e:
        error_msg = f"Failed to create/migrate schema '{schema_name}': {str(e)}"
        logger.error(error_msg)
        raise TenantMigrationError(error_msg) from e


def migrate_all() -> dict:
    """
    Migrate all tenant schemas found in the public.tenants table.
    
    Returns:
        dict: Summary of migration results with success/failure counts
    """
    logger.info("Starting batch migration for all tenants")
    
    # Import Tenant model here to avoid circular imports
    from Modules.Tenants.models import Tenant
    
    # Connect to public database to fetch tenant list
    public_engine = create_engine(settings.public_database_url)
    PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_engine)
    
    results = {
        "total_tenants": 0,
        "successful_migrations": 0,
        "failed_migrations": 0,
        "successes": [],
        "failures": []
    }
    
    try:
        db_public = PublicSessionLocal()
        tenants = db_public.query(Tenant).all()
        results["total_tenants"] = len(tenants)
        
        if not tenants:
            logger.info("No tenants found to migrate")
            return results
        
        logger.info(f"Found {len(tenants)} tenants to migrate")
        
        # Migrate each tenant
        for tenant in tenants:
            schema_name = tenant.db_schema_name
            try:
                logger.info(f"Processing tenant: {tenant.name} (schema: {schema_name})")
                create_schema_and_migrate(schema_name)
                
                results["successful_migrations"] += 1
                results["successes"].append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "schema_name": schema_name
                })
                logger.info(f"✅ Successfully migrated tenant: {tenant.name}")
                
            except Exception as e:
                results["failed_migrations"] += 1
                results["failures"].append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "schema_name": schema_name,
                    "error": str(e)
                })
                logger.error(f"❌ Failed to migrate tenant {tenant.name}: {e}")
        
    except Exception as e:
        logger.error(f"Failed to fetch tenants from public database: {e}")
        results["failures"].append({
            "error": f"Database connection failed: {e}"
        })
    finally:
        if 'db_public' in locals():
            db_public.close()
        public_engine.dispose()
    
    # Log summary
    logger.info(
        f"Migration batch completed: {results['successful_migrations']} success, "
        f"{results['failed_migrations']} failed, {results['total_tenants']} total"
    )
    
    return results


def migrate_public_schema() -> bool:
    """
    Run Alembic migrations for the public schema (catalogue tables).
    
    Returns:
        bool: True if successful
        
    Raises:
        TenantMigrationError: If migration fails
    """
    try:
        logger.info("Running Alembic migrations for public schema")
        
        alembic_cfg = AlembicConfig(str(ALEMBIC_INI_PATH))
        alembic_cfg.set_main_option("script_location", str(MIGRATIONS_PATH))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.public_database_url)
        alembic_cfg.set_main_option("metadata_choice", "public")
        # No version_table_schema needed for public (uses default)
        
        command.upgrade(alembic_cfg, "head")
        
        logger.info("Successfully completed public schema migration")
        return True
        
    except Exception as e:
        error_msg = f"Failed to migrate public schema: {str(e)}"
        logger.error(error_msg)
        raise TenantMigrationError(error_msg) from e


def clean_alembic_state() -> bool:
    """
    Clean up alembic_version tables from all databases to reset migration state.
    
    Returns:
        bool: True if successful
    """
    try:
        logger.info("Cleaning up Alembic state from all databases")
        
        # Clean public database
        public_engine = create_engine(settings.public_database_url)
        with public_engine.connect() as conn:
            conn.execute(text("SET autocommit = 1"))
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
            logger.info("Cleaned alembic_version from public database")
        public_engine.dispose()
        
        # Clean tenant schemas
        from Modules.Tenants.models import Tenant
        
        # Create a fresh engine for querying tenants
        public_query_engine = create_engine(settings.public_database_url)
        PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_query_engine)
        db_public = PublicSessionLocal()
        
        try:
            tenants = db_public.query(Tenant.db_schema_name).all()
            for tenant in tenants:
                schema_name = tenant.db_schema_name
                tenant_url = settings.tenant_url_template.format(schema=schema_name)
                tenant_engine = create_engine(tenant_url)
                
                try:
                    with tenant_engine.connect() as conn:
                        conn.execute(text("SET autocommit = 1"))
                        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
                        logger.info(f"Cleaned alembic_version from {schema_name}")
                except Exception as e:
                    logger.warning(f"Could not clean {schema_name}: {e}")
                finally:
                    tenant_engine.dispose()
        finally:
            db_public.close()
            public_query_engine.dispose()
        
        logger.info("Alembic state cleanup completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to clean Alembic state: {e}")
        return False


def get_tenant_schemas() -> List[str]:
    """
    Get list of all tenant schema names from the public.tenants table.
    
    Returns:
        List[str]: List of tenant schema names
    """
    # Import Tenant model here to avoid circular imports
    from Modules.Tenants.models import Tenant
    
    public_engine = create_engine(settings.public_database_url)
    PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_engine)
    
    try:
        db_public = PublicSessionLocal()
        tenants = db_public.query(Tenant.db_schema_name).all()
        return [tenant.db_schema_name for tenant in tenants]
    finally:
        if 'db_public' in locals():
            db_public.close()
        public_engine.dispose()