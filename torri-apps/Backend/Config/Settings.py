import os
from typing import List
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
    SERVER_HOST: str = "http://localhost:8000"
    
    # CORS configuration - configurable origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081,http://localhost:4200"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list, with environment-aware defaults"""
        # Support both comma and semicolon separators
        if ";" in self.CORS_ORIGINS:
            origins = self.CORS_ORIGINS.split(";")
        else:
            origins = self.CORS_ORIGINS.split(",")
        
        # Auto-detect Codespaces environment and add appropriate origins
        if self.is_codespaces:
            codespace_name = os.getenv("CODESPACE_NAME")
            domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
            if codespace_name and domain:
                # Add Codespaces URLs for common frontend ports
                codespaces_origins = [
                    f"https://{codespace_name}-3000.{domain}",  # React
                    f"https://{codespace_name}-5173.{domain}",  # Vite
                    f"https://{codespace_name}-8080.{domain}",  # Vue
                    f"https://{codespace_name}-4200.{domain}",  # Angular
                ]
                origins.extend(codespaces_origins)
        
        return [origin.strip() for origin in origins if origin.strip()]
    
    @property
    def is_codespaces(self) -> bool:
        """Detect if running in GitHub Codespaces"""
        return bool(os.getenv("CODESPACE_NAME"))
    
    @property
    def auto_server_host(self) -> str:
        """Auto-detect server host based on environment"""
        # Use explicit SERVER_HOST if set
        if self.SERVER_HOST != "http://localhost:8000":
            return self.SERVER_HOST
            
        # Auto-detect Codespaces
        if self.is_codespaces:
            codespace_name = os.getenv("CODESPACE_NAME")
            domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
            if codespace_name and domain:
                return f"https://{codespace_name}-8000.{domain}"
        
        # Fallback to configured value
        return self.SERVER_HOST
    
    # Schema configuration (from environment variable)
    default_schema_name: str = "public"  # Read from DEFAULT_SCHEMA_NAME env var
    
    # Timezone configuration (from environment variable)
    # Examples: "America/Sao_Paulo", "America/New_York", "Europe/London", "UTC"
    # Add TIMEZONE=America/Sao_Paulo to .env file for Brazil timezone
    timezone: str = "UTC"  # Read from TIMEZONE env var, defaults to UTC
    
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

