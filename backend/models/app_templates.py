"""
Model for app templates.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from .base import Base


class AppTemplate(Base):
    """
    Model for app templates that can be deployed by admins.
    """
    __tablename__ = "app_templates"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)  # Light mode or default icon
    dark_icon_url = Column(String, nullable=True)  # Dark mode icon
    template_config = Column(JSON, nullable=False)  # Configuration schema and default values
    template_code = Column(Text, nullable=False)  # Template code (HTML, JS, etc.)
    tags = Column(JSON, nullable=True)  # Array of tags
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to deployed apps - using string to avoid circular imports
    # This will be populated by the DeployedApp model
    deployments = relationship("DeployedApp", back_populates="template", lazy="dynamic", overlaps="template")
