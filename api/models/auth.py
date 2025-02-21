from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.orm import relationship
from .base import Base
from pydantic import BaseModel

class User(BaseModel):
    """User model"""
    id: int
    email: str
    hashed_password: str
    is_active: bool = True

class APIKey(BaseModel):
    """API Key model"""
    id: int
    key: str
    name: str
    user_id: int
    is_active: bool = True
    daily_limit: int = 1000
    minute_limit: int = 60

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