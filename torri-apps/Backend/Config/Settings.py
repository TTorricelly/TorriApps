from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Core application settings
    database_url: str = "sqlite:///./test.db"
    secret_key: str = "dummy-secret"
    redis_url: str = "redis://localhost:6379/0"
    debug: bool = False
    testing: bool = False
    
    # Authentication settings
    access_token_expire_minutes: int = 60
    jwt_algorithm: str = "HS256"
    
    # API configuration
    API_V1_PREFIX: str = "/api/v1"
    SERVER_HOST: str = "http://localhost:8000" # Base URL for serving static files etc.
    
    # Schema configuration (from environment variable)
    default_schema_name: str = "public"  # Read from DEFAULT_SCHEMA_NAME env var
    
    # Legacy multi-tenant settings (deprecated but kept for compatibility)
    public_database_url: str = ""  # Will use database_url if empty
    tenant_url_template: str = ""  # Will use database_url if empty
    tenant_engine_pool_size: int = 3
    
    def __post_init__(self):
        # Ensure backward compatibility - if legacy URLs not set, use main database_url
        if not self.public_database_url:
            self.public_database_url = self.database_url
        if not self.tenant_url_template:
            self.tenant_url_template = self.database_url
    
    class Config:
        env_file = '.env'

settings = Settings()

