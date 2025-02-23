"""Configuration module for the application."""
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# @important: Default allowed origins - do not remove without security review
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://app.peerdigital.se",
    "https://peerai-fe.onrender.com",
    "https://peerai-be.onrender.com"
]

class Settings(BaseSettings):
    # @url: https://www.postgresql.org/
    # @important: Database configuration - override with environment variables
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/peerai",
        description="Main database URL"
    )
    TEST_DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/peerai_test",
        description="Test database URL"
    )

    # @url: https://peerdigital.se
    # @important: CORS allowed origins - modify with caution
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: DEFAULT_ORIGINS.copy(),
        description="CORS allowed origins"
    )

    # @important: JWT settings for authentication
    # @url: https://jwt.io/
    JWT_SECRET_KEY: str = Field(
        default="development-only-key",
        description="JWT secret key - MUST be overridden in production"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate limiting settings
    RATE_LIMIT_MINUTE: int = Field(
        default=60,
        description="API requests per minute"
    )
    RATE_LIMIT_DAILY: int = Field(
        default=1000,
        description="API requests per day"
    )

    # API settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Peer AI"
    VERSION: str = "1.0.0"

    # @important: Environment settings
    ENVIRONMENT: str = Field(
        default="development",
        description="Current environment (development/staging/production)"
    )
    DEBUG: bool = Field(
        default=False,
        description="Debug mode - defaults to True in development, False in production"
    )
    MOCK_MODE: bool = Field(
        default=True,
        description="Mock external services"
    )

    # LLM Configuration
    # @url: https://llm-api.bahnhof.se/v1/completions
    HOSTED_LLM_URL: str = Field(
        default="",
        description="Hosted LLM API URL"
    )
    
    # @url: https://mistral.ai/
    # @important: Mistral API endpoint
    EXTERNAL_LLM_URL: str = Field(
        default="https://api.mistral.ai/v1/chat/completions",
        description="External LLM API URL"
    )
    
    HOSTED_LLM_API_KEY: str = Field(
        default="",
        description="Hosted LLM API key"
    )
    # @important: Mistral API key
    EXTERNAL_LLM_API_KEY: str = Field(
        default="",
        description="External LLM API key - Required for production"
    )

    # @important: Model Configuration
    # @model: mistral-tiny
    EXTERNAL_MODEL: str = Field(
        default="mistral-tiny",
        description="External LLM model name"
    )

    model_config = {
        "case_sensitive": True,
        "env_prefix": "",
        "use_enum_values": True,
    }

    @validator("DEBUG", pre=True)
    def set_debug_based_on_environment(cls, v, values):
        """Set debug mode based on environment if not explicitly set."""
        if v is None:
            return values.get("ENVIRONMENT", "development") == "development"
        return v

    def get_database_url(self) -> str:
        """Get environment-specific database URL."""
        if self.ENVIRONMENT == "test":
            return self.TEST_DATABASE_URL
        return self.DATABASE_URL

settings = Settings()
