from logging.config import fileConfig

import mysql.connector

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import create_engine # Add if not present or used differently
from Config.Settings import settings
from Config.Database import BasePublic # Corrected path

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
        include_schemas=True
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
    connectable = create_engine(SQLALCHEMY_URL)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=None,  # Changed
            include_schemas=True
            # any other existing options like render_as_batch might be needed depending on DB
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
