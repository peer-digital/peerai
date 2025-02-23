"""Admin schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator


class RateLimitSettings(BaseModel):
    """Rate limit settings."""

    enabled: bool = True
    requestsPerMinute: int = Field(60, ge=1)
    tokensPerDay: int = Field(1000, ge=1)


class SecuritySettings(BaseModel):
    """Security settings."""

    maxTokenLength: int = Field(4096, ge=1)
    allowedOrigins: Union[str, List[str]]  # Can be either string or list

    @validator("allowedOrigins")
    def validate_allowed_origins(cls, v):
        if isinstance(v, str):
            # Convert comma-separated string to list
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins
        return v


class ModelSettings(BaseModel):
    """Model settings."""

    defaultModel: str = "claude-3-sonnet-20240229"  # @note: Model name - do not change
    maxContextLength: int = Field(100000, ge=1)
    temperature: float = Field(0.7, ge=0.0, le=1.0)


class MonitoringSettings(BaseModel):
    """Monitoring settings."""

    logLevel: str = "info"
    retentionDays: int = Field(30, ge=1)
    alertThreshold: int = Field(5, ge=1)


class BetaFeatures(BaseModel):
    """Beta feature settings."""

    visionEnabled: bool = False
    audioEnabled: bool = False
    visionModel: str = "claude-3-opus-20240229"  # @note: Model name - do not change
    audioModel: str = "whisper-1"  # @note: Model name - do not change


class SystemSettings(BaseModel):
    """System settings."""

    rateLimit: RateLimitSettings
    security: SecuritySettings
    models: ModelSettings
    monitoring: MonitoringSettings
    betaFeatures: BetaFeatures


class UserResponse(BaseModel):
    """User response model."""

    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True
