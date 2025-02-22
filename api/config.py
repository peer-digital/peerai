from pydantic_settings import BaseSettings
import os
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "PeerAI"
    VERSION: str = "0.1.0"
    DEBUG: bool = False  # Controlled via environment variable
    MOCK_MODE: bool = False  # Disable mock mode to use real LLM
    
    # @important: Default database URL for development
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/peerai"
    
    # @important: CORS origins configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://app.peerai.se"
    
    # @important: JWT configuration
    SECRET_KEY: str = "your-secret-key-here"  # Override in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # @important: Rate limiting defaults
    DEFAULT_DAILY_LIMIT: int = 1000
    DEFAULT_MINUTE_LIMIT: int = 60
    
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
    
    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from environment variables
        case_sensitive = True

settings = Settings() 