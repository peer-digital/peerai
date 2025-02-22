from sqlalchemy import Column, Integer, DateTime, JSON
from sqlalchemy.sql import func

from .base import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    rate_limit = Column(JSON, nullable=False)
    security = Column(JSON, nullable=False)
    models = Column(JSON, nullable=False)
    monitoring = Column(JSON, nullable=False)
    beta_features = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False) 