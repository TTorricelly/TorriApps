from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    redis_url: str  # Added field
    debug: bool = False
    default_schema_name: str = "public" # Nova adição
    access_token_expire_minutes: int = 60 # Default to 60 minutes
    jwt_algorithm: str = "HS256" # Algorithm for JWT encoding/decoding
    
    class Config:
        env_file = '.env'

settings = Settings()

