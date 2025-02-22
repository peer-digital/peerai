"""Usage tracking models."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship

from .base import Base

class UsageRecord(Base):
    """Model for tracking API usage."""
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    api_key_id = Column(Integer, ForeignKey("api_keys.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    model = Column(String)  # @note: Model name - do not change
    endpoint = Column(String)
    tokens_used = Column(Integer)
    latency_ms = Column(Float)
    error = Column(Boolean, default=False)
    error_type = Column(String, nullable=True)
    error_message = Column(String, nullable=True)  # @note: Stores error details
    status_code = Column(Integer, nullable=True)  # @note: HTTP status code of the request
    
    # Relationships
    user = relationship("User", back_populates="usage_records")
    api_key = relationship("APIKey", back_populates="usage_records") 