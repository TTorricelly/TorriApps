from logging.config import fileConfig
import sys
import os
import sqlalchemy as sa
import alembic # For alembic.__version__

import mysql.connector

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import create_engine # Add if not present or used differently
from Config.Settings import settings
from Config.Database import BasePublic, Base # Corrected path, Added Base for tenant models
from Backend.Modules.Tenants.models import Tenant # To query tenant schemas
from Backend.Modules.AdminMaster import models as admin_master_models_for_metadata_registration # New line

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
SQLALCHEMY_URL = "mysql+mysqlconnector://root:@localhost:3306/torri_app_public"
target_metadata = BasePublic.metadata
# --- Start Diagnostic Prints ---
print("="*50)
print("DEBUG: env.py - METADATA INSPECTION FOR AUTOGENERATE")
print(f"DEBUG: Python version: {sys.version}") # Requires import sys
print(f"DEBUG: Alembic version: {alembic.__version__}") # Requires import alembic
print(f"DEBUG: SQLAlchemy version: {sa.__version__}") # Requires import sqlalchemy as sa
print(f"DEBUG: Current working directory: {os.getcwd()}") # Requires import os

print(f"DEBUG: BasePublic.metadata object ID: {id(BasePublic.metadata)}")
print(f"DEBUG: Tables in BasePublic.metadata: {list(BasePublic.metadata.tables.keys())}")
for table_name, table_obj in BasePublic.metadata.tables.items():
    print(f"DEBUG:   Table: {table_name}, Columns: {[c.name for c in table_obj.columns]}")

print(f"DEBUG: Global target_metadata object ID: {id(target_metadata)}")
if target_metadata is not None:
    print(f"DEBUG: Tables in global target_metadata: {list(target_metadata.tables.keys())}")
else:
    print("DEBUG: Global target_metadata is None.")
print("="*50)
# --- End Diagnostic Prints ---

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # url = config.get_main_option("sqlalchemy.url") # Commented out or remove
    context.configure(
        url=SQLALCHEMY_URL,  # Use the defined URL
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=None,  # Changed
        include_schemas=True,
        compare_type=True,             # Added
        compare_server_default=True    # Added
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # connectable = engine_from_config(
    #     config.get_section(config.config_ini_section, {}),
    #     prefix="sqlalchemy.",
    #     poolclass=pool.NullPool,
    # )
    # Connect to the 'public' schema / main database
    # This part is largely the same as before for public schema migrations
    public_engine = create_engine(SQLALCHEMY_URL) # SQLALCHEMY_URL points to torri_app_public

    with public_engine.connect() as public_connection:
        print(f"INFO: Configuring Alembic for public schema ({SQLALCHEMY_URL})...")
        context.configure(
            connection=public_connection,
            target_metadata=BasePublic.metadata, # For public schema tables
            version_table_schema=None, # As torri_app_public is the default DB for this engine
            include_schemas=True
        )

        with context.begin_transaction():
            print("INFO: Running migrations for public schema...")
            context.run_migrations()
        print("INFO: Public schema migrations complete.")

    # --- Tenant Schema Migrations ---
    print("\nINFO: Starting tenant schema migrations...")
    # Use the public_engine to query the tenants table
    # No, create a new session from public_engine to avoid issues with transaction state
    from sqlalchemy.orm import sessionmaker
    PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_engine)
    db_public = PublicSessionLocal()

    tenants = [] # Initialize tenants to an empty list
    try:
        tenants = db_public.query(Tenant).all()
        if not tenants:
            print("INFO: No tenants found to migrate.")
    finally:
        db_public.close() # Ensure session is closed

    for tenant in tenants:
        tenant_schema_name = tenant.db_schema_name
        print(f"\nINFO: Processing migrations for tenant schema: {tenant_schema_name}")

        # Construct database URL for the specific tenant schema
        # This assumes each tenant schema can be addressed as a database in the connection string
        tenant_db_url = f"mysql+mysqlconnector://root:@localhost:3306/{tenant_schema_name}"

        print(f"INFO: Connecting to tenant schema {tenant_schema_name} using URL: {tenant_db_url}")
        tenant_engine = create_engine(tenant_db_url)

        with tenant_engine.connect() as tenant_connection:
            context.configure(
                connection=tenant_connection,
                target_metadata=Base.metadata,  # For tenant-specific tables
                version_table_schema=None,  # Alembic version table will be in the tenant's schema (default for this connection)
                include_schemas=True
                # render_as_batch=True # Consider adding if using SQLite for tests and have complex constraints
            )

            with context.begin_transaction():
                print(f"INFO: Running migrations for schema: {tenant_schema_name}...")
                context.run_migrations()
            print(f"INFO: Migrations for schema {tenant_schema_name} complete.")

        tenant_engine.dispose() # Dispose of the engine after use

    print("\nINFO: All tenant schema migrations processed.")
    public_engine.dispose() # Dispose of the public engine at the very end


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
