"""
Model for deployed AI apps.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base
from .auth import User


class DeployedApp(Base):
    """
    Model for deployed AI apps.
    """
    __tablename__ = "deployed_apps"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("app_templates.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)  # Null for organization-wide deployments
    deployed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # Custom name for the deployment
    slug = Column(String, unique=True, nullable=False, index=True)  # Custom slug for the deployment
    configuration = Column(JSON, nullable=True)  # Configuration parameters for the app
    custom_code = Column(Text, nullable=True)  # Custom code modifications
    public_url = Column(String, nullable=True)  # Public URL for the deployed app
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    template = relationship("AppTemplate", back_populates="deployments")
    deployed_by = relationship("User", backref="deployed_apps")
    team = relationship("Team", backref="deployed_apps")
