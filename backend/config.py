from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # @url: https://www.postgresql.org/
    DATABASE_URL: str = "postgresql://user:password@localhost/peerai"

    # @url: https://peerdigital.se
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.peerdigital.se",
        "https://peerai-fe.onrender.com",  # Frontend on Render
        "https://peerai-be.onrender.com",  # Backend on Render
    ]

    # @important: JWT settings for authentication
    # @url: https://jwt.io/
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "your-secret-key-for-development-only"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate limiting settings
    RATE_LIMIT_MINUTE: int = 60
    RATE_LIMIT_DAILY: int = 1000

    # API settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Peer AI"
    VERSION: str = "1.0.0"

    # @important: Environment settings
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() == "true"

    # @important: Test database configuration
    # @url: https://www.postgresql.org/
    TEST_DATABASE_URL: str = os.getenv(
        "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/peerai_test"
    )

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
        case_sensitive = True


settings = Settings()
