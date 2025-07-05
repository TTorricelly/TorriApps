from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
import time
import logging
from .Settings import settings

logger = logging.getLogger(__name__)

# SIMPLIFIED: Single schema configuration - no complex multi-tenant pool management needed
# PostgreSQL connection configuration
connect_args = {}
if settings.database_url.startswith('postgresql://'):
    # Configure SSL based on connection type
    if '/cloudsql/' in settings.database_url:
        # Cloud Run with Unix socket - disable SSL
        ssl_mode = "disable"
    elif 'localhost' in settings.database_url or '127.0.0.1' in settings.database_url:
        # Local development - prefer SSL but don't require
        ssl_mode = "prefer"
    else:
        # External Cloud SQL connection - require SSL
        ssl_mode = "require"
    
    connect_args = {
        "sslmode": ssl_mode,
        "connect_timeout": 60,   # 60 seconds timeout
        "application_name": "torriapps-backend",
        "keepalives_idle": 60,   # Start keepalives after 1 minute
        "keepalives_interval": 5,  # Check every 5 seconds
        "keepalives_count": 20,  # 20 retry attempts
        "tcp_user_timeout": 300000,  # 5 minutes TCP timeout (milliseconds)
        "options": "-c statement_timeout=300000",  # 5 minute statement timeout
    }

# Create engine with maximum resilience settings
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,          # Validates connections before use
    pool_recycle=900,            # Recycle connections every 15 minutes
    pool_size=3,                 # Very small pool size
    max_overflow=5,              # Small overflow
    pool_reset_on_return='commit',  # Reset connection state on return
    pool_timeout=180,            # 3 minutes wait time for connection from pool
    echo=False,                  # Disable SQL logging for cleaner console
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# DISABLED: Event listeners run before middleware, so tenant context is not available
# Schema setting is handled explicitly in get_db() and get_tenant_db() functions
from sqlalchemy import event, text
# @event.listens_for(engine, "connect")
# @event.listens_for(engine, "checkout")

# Single Base for all models - no need for separate Public/Tenant bases
Base = declarative_base()

# Legacy BasePublic alias for backward compatibility during migration
BasePublic = Base

# Note: All models now use the same Base and target the same schema
# Model imports are handled in migrations/env.py to avoid circular imports


def get_db():
    """Yield a new database session for request handling with retry logic."""
    max_retries = 3
    retry_delay = 1  # Start with 1 second delay
    
    for attempt in range(max_retries):
        try:
            db = SessionLocal()
            # Test the connection immediately
            db.execute("SELECT 1")
            try:
                yield db
                break  # Success, exit retry loop
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                # Last attempt failed, re-raise the exception
                raise
            # Wait before retrying with exponential backoff
            time.sleep(retry_delay)
            retry_delay *= 2  # Double the delay for next attempt

