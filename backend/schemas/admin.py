"""Admin schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator
from core.roles import Role


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
    role: Role
    created_at: datetime
    last_login: Optional[datetime] = None  # Default to None if not present
    token_limit: int = 10000  # Default token limit of 10,000
    referral_stats: Optional[dict] = {
        "total_referrals": 0,
        "successful_referrals": 0,
        "pending_referrals": 0,
        "total_tokens_earned": 0,
        "referral_code": ""
    }

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User update model."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[Role] = None
    token_limit: Optional[int] = None

    class Config:
        from_attributes = True
