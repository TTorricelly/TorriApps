from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
# sqlalchemy.create_engine is not directly used in the new version.
# Specific model imports (Tenant, AdminMasterUser) are removed.
# sys, os, alembic (for version), mysql.connector, sqlalchemy as sa are removed.
# Config.Settings is removed as settings object is not directly used in this new env.py.

from alembic import context

# This import is crucial for the dual-metadata setup.
from Config.Database import Base, BasePublic

# Import models conditionally based on which metadata we're using
# This prevents cross-schema foreign key resolution issues during autogenerate

# Always import public models (they're needed for both cases)
from Modules.Tenants.models import Tenant
from Modules.AdminMaster.models import AdminMasterUser

# Import tenant models only when working with tenant metadata
# This prevents issues with cross-schema foreign keys during public schema generation
if context.get_x_argument(as_dictionary=True).get("metadata_choice") != "public":
    from Core.Auth.models import UserTenant
    from Modules.Services.models import Service, Category
    from Modules.Appointments.models import Appointment
    from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Determine which metadata to use based on a command-line or .ini option.
# The default is "tenant" if "metadata_choice" is not provided.
# To generate a migration for the public schema, you would run:
# alembic -x metadata_choice=public revision -m "create_public_tables"
# To generate a migration for the tenant schema, you would run:
# alembic -x metadata_choice=tenant revision -m "create_tenant_tables"
# or simply: alembic revision -m "create_tenant_tables" (as tenant is default)

# Check both main option and -x parameter
which_metadata = context.get_x_argument(as_dictionary=True).get("metadata_choice")
if which_metadata is None:
    which_metadata = config.get_main_option("metadata_choice", "tenant")

if which_metadata == "public":
    print("INFO: Using PUBLIC metadata for Alembic operations.")
    target_metadata = BasePublic.metadata
else:
    print("INFO: Using TENANT metadata for Alembic operations.")
    target_metadata = Base.metadata

# For autogenerate to detect changes, all model files that define tables
# in EITHER Base.metadata or BasePublic.metadata must have been imported
# by the time these metadata objects are constructed and used.
# This is typically achieved by ensuring that __init__.py files in your models
# directories (or the Config.Database module itself) import all relevant models.

def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to include only tables we want in migrations.
    This prevents Alembic from detecting system schemas and other databases.
    """
    if type_ == "table":
        # Get the current metadata choice
        metadata_choice = context.get_x_argument(as_dictionary=True).get("metadata_choice", "tenant")
        
        if metadata_choice == "public":
            # For public schema, only include our public tables
            return name in ['tenants', 'admin_master_users']
        else:
            # For tenant schema, only include tables that are in our target metadata
            if target_metadata is not None:
                return name in target_metadata.tables
            return False
    
    elif type_ == "index":
        # Only include indexes for tables we're managing
        metadata_choice = context.get_x_argument(as_dictionary=True).get("metadata_choice", "tenant")
        
        if metadata_choice == "public":
            return name.startswith('ix_admin_master_users_') or name.startswith('ix_tenants_')
        else:
            # For tenant schemas, include indexes from our metadata
            if target_metadata is not None:
                for table_name, table in target_metadata.tables.items():
                    if hasattr(table, 'indexes'):
                        for index in table.indexes:
                            if index.name == name:
                                return True
            return False
    
    # For other objects (constraints, etc.), include them if they belong to our tables
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    # version_table_schema can be passed via -x version_table_schema=my_schema
    # or set in alembic.ini. If None, Alembic uses its default behavior.
    vts = config.get_main_option("version_table_schema")

    print(f"DEBUG: run_migrations_offline(): sqlalchemy.url={url}")
    print(f"DEBUG: run_migrations_offline(): metadata_choice={which_metadata}")
    print(f"DEBUG: run_migrations_offline(): version_table_schema={vts}")
    print(f"DEBUG: run_migrations_offline(): Using metadata with tables: {list(target_metadata.tables.keys()) if target_metadata else 'None'}")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=False,  # Set to False to avoid cross-schema issues
        version_table_schema=vts,
        compare_type=True,
        compare_server_default=True,
        include_object=include_object  # Add the filter
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # version_table_schema can be passed via -x version_table_schema=my_schema
        # or set in alembic.ini. If None, Alembic uses its default behavior.
        vts = config.get_main_option("version_table_schema")

        print(f"DEBUG: run_migrations_online(): metadata_choice={which_metadata}")
        print(f"DEBUG: run_migrations_online(): version_table_schema={vts}")
        print(f"DEBUG: run_migrations_online(): Using metadata with tables: {list(target_metadata.tables.keys()) if target_metadata else 'None'}")

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=False,  # Set to False to avoid cross-schema issues
            version_table_schema=vts,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object  # Add the filter
        )

        with context.begin_transaction():
            context.run_migrations()

    # Dispose of the engine after use
    if connectable:
        connectable.dispose()


if context.is_offline_mode():
    print("INFO: Running migrations in OFFLINE mode.")
    run_migrations_offline()
else:
    print("INFO: Running migrations in ONLINE mode.")
    run_migrations_online()
