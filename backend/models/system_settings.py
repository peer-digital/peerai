from sqlalchemy import Column, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func

from .base import Base


# @important: This extends the DBSystemSettings model from auth.py
# Both models reference the same database table with __table_args__ = {"extend_existing": True}
class SystemSettings(Base):
    __tablename__ = "system_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    rate_limit = Column(
        JSON,
        nullable=False,
        default={"enabled": True, "requestsPerMinute": 60, "tokensPerDay": 100000}
    )
    security = Column(
        JSON,
        nullable=False,
        default={
            "requireSSL": True,
            "maxTokenLength": 4096,
            "allowedOrigins": [
                "http://localhost:3000",
                "http://localhost:5173",
                "https://app.peerdigital.se",
            ],
        },
    )
    models = Column(
        JSON,
        nullable=False,
        default={
            "defaultModel": "mistral-small-latest",
            "maxContextLength": 32768,  # Mistral's context length
            "maxTokens": 1024,  # Default max tokens for generation
            "temperature": 0.7,
        },
    )
    monitoring = Column(
        JSON,
        nullable=False,
        default={"logLevel": "info", "retentionDays": 30, "alertThreshold": 5}
    )
    beta_features = Column(
        JSON,
        nullable=False,
        default={
            "visionEnabled": False,
            "audioEnabled": False,
            "visionModel": "claude-3-opus-20240229",
            "audioModel": "whisper-1",
        },
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
