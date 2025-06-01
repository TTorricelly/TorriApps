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
# Import ALL model modules to ensure metadata registration
from Modules.Tenants import models as tenant_models_for_metadata_registration
from Modules.AdminMaster import models as admin_master_models_for_metadata_registration
from Modules.Tenants.models import Tenant # To query tenant schemas

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

def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to include only tables we want in migrations.
    This prevents Alembic from detecting system schemas and other databases.
    """
    if type_ == "table":
        # Only include tables that are in our target metadata
        if target_metadata is not None:
            return name in target_metadata.tables
        # For public schema, only include our specific tables
        return name in ['tenants', 'admin_master_users', 'alembic_version']
    elif type_ == "index":
        # Only include indexes for our tables
        if target_metadata is not None:
            # Check if the index belongs to any of our tables
            for table_name, table in target_metadata.tables.items():
                if hasattr(table, 'indexes'):
                    for index in table.indexes:
                        if index.name == name:
                            return True
        return name.startswith('ix_admin_master_users_') or name.startswith('ix_tenants_')
    return True

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
    current_target_metadata_for_offline = BasePublic.metadata
    print(f"DEBUG: run_migrations_offline(): Using metadata with tables: {list(current_target_metadata_for_offline.tables.keys())}")
    context.configure(
        url=SQLALCHEMY_URL,  # Use the defined URL
        target_metadata=current_target_metadata_for_offline,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=None,  # Changed
        include_schemas=False,         # Changed to False to avoid cross-schema issues
        compare_type=True,             # Added
        compare_server_default=True,   # Added
        render_as_batch=False,         # Set to True if using SQLite
        include_object=include_object  # Added filtering function
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
            include_schemas=False,     # Avoid cross-schema issues
            include_object=include_object  # Filter out system tables
        )

        with context.begin_transaction():
            print("INFO: Running migrations for public schema...")
            context.run_migrations()
        print("INFO: Public schema migrations complete.")

    # --- Tenant Schema Migrations ---
    # Check if the command is 'revision', if so, skip tenant logic
    import sys
    is_revision_command = len(sys.argv) > 1 and sys.argv[1] == 'revision'

    if not is_revision_command:
        print("\nINFO: Starting tenant schema migrations...")
        from sqlalchemy.orm import sessionmaker
        PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=public_engine)
        db_public = PublicSessionLocal()

        tenants = []
        try:
            tenants = db_public.query(Tenant).all()
            if not tenants:
                print("INFO: No tenants found to migrate.")
        finally:
            db_public.close()

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
    else:
        print("\nINFO: Skipping tenant schema migrations during 'revision' command.")

    public_engine.dispose() # This should be outside the conditional block if public_engine is always created.
                            # Or, ensure it's only disposed if created.
                            # Given the current structure, public_engine is always created.


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
