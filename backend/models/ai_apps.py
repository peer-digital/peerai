from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from .base import Base


class AIApp(Base):
    """
    Model for AI Apps in the App Store.
    """

    __tablename__ = "ai_apps"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon_url = Column(String, nullable=True)
    app_url = Column(String, nullable=False)
    tags = Column(JSON, nullable=True)  # List of tags/categories
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)