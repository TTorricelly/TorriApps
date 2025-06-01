from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    redis_url: str  # Added field
    debug: bool = False
    default_schema_name: str = "public" # Nova adição
    access_token_expire_minutes: int = 60 # Default to 60 minutes
    jwt_algorithm: str = "HS256" # Algorithm for JWT encoding/decoding
    
    # Tenant Migration Settings
    public_database_url: str = "mysql+mysqlconnector://root:@localhost:3306/torri_app_public"
    tenant_url_template: str = "mysql+mysqlconnector://root:@localhost:3306/{schema}"
    tenant_engine_pool_size: int = 3
    
    class Config:
        env_file = '.env'

settings = Settings()

