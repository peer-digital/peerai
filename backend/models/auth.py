from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    ForeignKey,
    Integer,
    DateTime,
    JSON,
    func,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from .base import Base
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.roles import Role


class Team(Base):
    """Team model for organization/customer accounts"""

    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    members = relationship("User", back_populates="team", foreign_keys="[User.team_id]")
    created_by = relationship("User", foreign_keys=[created_by_id])


class User(Base):
    """User model"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(SQLEnum(Role), default=Role.USER, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    api_keys = relationship(
        "APIKey", back_populates="user", cascade="all, delete-orphan"
    )
    usage_records = relationship("UsageRecord", back_populates="user")
    team = relationship("Team", back_populates="members", foreign_keys=[team_id])

    @property
    def is_superuser(self):
        """Maintain backwards compatibility with existing is_superuser field"""
        return self.role == Role.SUPER_ADMIN


class APIKey(Base):
    """API key model"""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    daily_limit = Column(Integer, default=1000)
    minute_limit = Column(Integer, default=60)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")
    usage_records = relationship("UsageRecord", back_populates="api_key")


class DBSystemSettings(Base):
    """Database model for system settings."""

    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    rate_limit = Column(
        JSON, default={"enabled": True, "requestsPerMinute": 60, "tokensPerDay": 100000}
    )
    security = Column(
        JSON,
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
        default={
            "defaultModel": "claude-3-sonnet-20240229",
            "maxContextLength": 100000,
            "temperature": 0.7,
        },
    )
    monitoring = Column(
        JSON, default={"logLevel": "info", "retentionDays": 30, "alertThreshold": 5}
    )
    beta_features = Column(
        JSON,
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
