from logging.config import fileConfig

import mysql.connector

from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool

from alembic import context

# This import is crucial for the dual-metadata setup. # Now simplified for single schema
from Config.Database import Base # BasePublic removed

# Import all models for the single schema operation
from Core.Auth.models import User # Changed from UserTenant
from Modules.Services.models import Service, Category
from Modules.Appointments.models import Appointment
from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
# from Modules.AdminMaster.models import AdminMasterUser # Commented out due to ModuleNotFoundError
# from Modules.Tenants.models import Tenant # Tenant model removed

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
# alembic -x metadata_choice=tenant revision -m "create_tenant_tables" # Comment retained for context, but logic removed
# or simply: alembic revision -m "create_tenant_tables" (as tenant is default) # Comment retained

# Metadata choice logic removed, always use Base.metadata for single schema
print("INFO: Using main Base.metadata for Alembic operations.")
target_metadata = Base.metadata
# SQLALCHEMY_URL will be taken from alembic.ini via config.get_main_option("sqlalchemy.url")

# For autogenerate to detect changes, all model files that define tables
# in Base.metadata must have been imported
# by the time these metadata objects are constructed and used.
# This is typically achieved by ensuring that __init__.py files in your models
# directories (or the Config.Database module itself) import all relevant models.

def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to include only tables we want in migrations.
    This ensures Alembic only operates on tables defined in our Base.metadata.
    """
    if type_ == "table":
        return name in target_metadata.tables
    # For other types like indexes, constraints, allow Alembic to manage them
    # if they are associated with the tables in target_metadata.
    # A more granular control might be needed if there are shared indexes/constraints
    # from other metadata objects, but for a single Base.metadata, this should be fine.
    # If issues arise, one might need to check `object.table.name in target_metadata.tables`.
    return True # Default to include other types like indexes, constraints


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

    # print(f"DEBUG: run_migrations_offline(): sqlalchemy.url={url}") # Using url from config
    # print(f"DEBUG: run_migrations_offline(): metadata_choice={which_metadata}") # metadata_choice removed
    # print(f"DEBUG: run_migrations_offline(): version_table_schema={vts}")
    # print(f"DEBUG: run_migrations_offline(): Using metadata with tables: {list(target_metadata.tables.keys()) if target_metadata else 'None'}")

    context.configure(
        url=url,  # Use URL from alembic.ini
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
    connectable = engine_from_config( # Use engine_from_config to read from alembic.ini
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    # connectable = create_engine(SQLALCHEMY_URL) # Hardcoded URL removed

    with connectable.connect() as connection:
        # version_table_schema can be passed via -x version_table_schema=my_schema
        # or set in alembic.ini. If None, Alembic uses its default behavior.
        vts = config.get_main_option("version_table_schema")

        # print(f"DEBUG: run_migrations_online(): metadata_choice={which_metadata}") # metadata_choice removed
        # print(f"DEBUG: run_migrations_online(): version_table_schema={vts}")
        # print(f"DEBUG: run_migrations_online(): Using metadata with tables: {list(target_metadata.tables.keys()) if target_metadata else 'None'}")

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
