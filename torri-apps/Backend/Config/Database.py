from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .Settings import settings

# SIMPLIFIED: Single schema configuration - no complex multi-tenant pool management needed
# PostgreSQL connection configuration for Codespaces
connect_args = {}
if settings.database_url.startswith('postgresql://'):
    # PostgreSQL specific settings for Supabase in Codespaces
    connect_args = {
        "sslmode": "require",  # Required for Supabase
        "connect_timeout": 30,  # Longer timeout for Codespaces
        "application_name": "torriapps-backend",
    }

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,          # Validates connections before use
    pool_recycle=3600,           # Recycle connections every hour
    pool_size=10,                # Reduced pool size for single schema
    max_overflow=15,             # Reduced overflow for single schema
    pool_reset_on_return='commit',  # Reset connection state on return
    pool_timeout=30,             # Max wait time for connection from pool
    echo=settings.debug,         # Show SQL in debug mode
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Single Base for all models - no need for separate Public/Tenant bases
Base = declarative_base()

# Legacy BasePublic alias for backward compatibility during migration
BasePublic = Base

# Note: All models now use the same Base and target the same schema
# Model imports are handled in migrations/env.py to avoid circular imports


def get_db():
    """Yield a new database session for request handling."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

