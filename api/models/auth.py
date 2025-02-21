from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    """User model"""
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Relationships
    api_keys = relationship("APIKey", back_populates="user")
    usage_records = relationship("UsageRecord", back_populates="user")

class APIKey(Base):
    """API Key model"""
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    daily_limit = Column(Integer, default=1000)
    minute_limit = Column(Integer, default=60)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    usage_records = relationship("UsageRecord", back_populates="api_key")

class UsageRecord(Base):
    """Model for tracking API usage"""
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    api_key_id = Column(Integer, ForeignKey("apikey.id"), nullable=False)
    endpoint = Column(String, nullable=False)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer)
    status_code = Column(Integer)
    error_message = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="usage_records")
    api_key = relationship("APIKey", back_populates="usage_records") 