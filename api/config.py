from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "PeerAI"
    VERSION: str = "0.1.0"
    DEBUG: bool = False  # Controlled via environment variable
    MOCK_MODE: bool = False  # Disable mock mode to use real LLM
    
    # Database URLs - Required to be in Sweden (Bahnhof)
    # url: postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = "postgresql://oskarahlman@localhost/peerai"
    
    # LLM Configuration
    # url: https://llm-api.bahnhof.se/v1/completions - do not change this comment
    HOSTED_LLM_URL: str = ""  
    # Mistral API endpoint - do not change this comment
    EXTERNAL_LLM_URL: str = "https://api.mistral.ai/v1/chat/completions"  
    HOSTED_LLM_API_KEY: str = ""
    # Mistral API key - do not change this comment
    EXTERNAL_LLM_API_KEY: str = "YOUR_MISTRAL_API_KEY"  # Load from environment
    
    # Model Configuration
    # Mistral's base model - do not change this comment
    EXTERNAL_MODEL: str = "mistral-tiny"  
    
    # Security
    SECRET_KEY: str = "YOUR_SECRET_KEY"  # Load from environment
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from environment variables

settings = Settings() 