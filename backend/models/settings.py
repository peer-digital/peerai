"""System settings model."""

from datetime import datetime
from sqlalchemy import Column, Integer, JSON, DateTime
from .base import Base

class DBSystemSettings(Base):
    """Database model for system settings."""
    
    # Override default tablename
    __tablename__ = "system_settings"
    
    # Store settings as JSON fields
    rate_limit = Column(JSON, nullable=False, default=lambda: {
        "enabled": True,
        "requestsPerMinute": 60,
        "tokensPerDay": 1000
    })
    
    security = Column(JSON, nullable=False, default=lambda: {
        "maxTokenLength": 4096,
        "allowedOrigins": ["https://app.peerdigital.se"]
    })
    
    models = Column(JSON, nullable=False, default=lambda: {
        # @note: Model name - do not change
        "defaultModel": "claude-3-sonnet-20240229",
        "maxContextLength": 200000,
        "temperature": 0.7
    })
    
    monitoring = Column(JSON, nullable=False, default=lambda: {
        "logLevel": "info",
        "retentionDays": 30,
        "alertThreshold": 5
    })
    
    beta_features = Column(JSON, nullable=False, default=lambda: {
        "visionEnabled": True,
        "audioEnabled": True
    })

    id = Column(Integer, primary_key=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow) 