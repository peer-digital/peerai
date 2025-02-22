from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func

from .base import Base

class APIKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    daily_limit = Column(Integer, server_default="1000")
    minute_limit = Column(Integer, server_default="60")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False) 