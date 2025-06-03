from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .Settings import settings

# Configure engine with proper connection pool settings for multi-tenant schema switching
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Validates connections before use
    pool_recycle=1800,   # Recycle connections every 30 minutes (more aggressive)
    pool_size=5,         # Smaller pool size to reduce state corruption
    max_overflow=10,     # Reduced overflow to prevent too many concurrent connections
    pool_reset_on_return='commit',  # Force reset connection state on return to pool
    echo=False           # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos de tenant-specific schemas
Base = declarative_base()

# Base para modelos do schema público
# Adicionar metadados para o schema publico, se necessário para Alembic
# metadata_public = MetaData(schema=settings.default_schema_name)
# BasePublic = declarative_base(metadata=metadata_public)
# Simplesmente criar outra base pode ser suficiente e o schema é definido no modelo.
BasePublic = declarative_base()

# Note: Model imports are handled in migrations/env.py to avoid circular imports
# The models are imported there to ensure Base.metadata and BasePublic.metadata are populated
# when running Alembic operations

