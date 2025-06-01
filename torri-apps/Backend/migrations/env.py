from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
# sqlalchemy.create_engine is not directly used in the new version.
# Specific model imports (Tenant, AdminMasterUser) are removed.
# sys, os, alembic (for version), mysql.connector, sqlalchemy as sa are removed.
# Config.Settings is removed as settings object is not directly used in this new env.py.

from alembic import context

# This import is crucial for the dual-metadata setup.
# It's assumed that Config.Database imports all models that contribute to Base and BasePublic.
from Config.Database import Base, BasePublic

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
        include_schemas=True,
        version_table_schema=vts,
        compare_type=True,
        compare_server_default=True,
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
            include_schemas=True, # Important for schema-based multi-tenancy if version table is in a shared schema
            version_table_schema=vts
            # compare_type and compare_server_default are not explicitly set here by user spec for online,
            # but can be added if needed for autogenerate consistency when running 'online' checks.
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
