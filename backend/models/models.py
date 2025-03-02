"""Model registry models for managing AI model providers and models."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from typing import Optional, Dict, Any, List

from .base import Base


class ModelStatus(str, PyEnum):
    """Status of a model in the registry."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    BETA = "beta"


class ModelProvider(Base):
    """Model for AI model providers (e.g., Mistral, Anthropic, etc.)."""

    __tablename__ = "model_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # @important: Provider name (e.g., "mistral", "anthropic")
    display_name = Column(String, nullable=False)  # Human-readable name (e.g., "Mistral AI")
    api_base_url = Column(String, nullable=False)  # @url: Base URL for API calls
    api_key_env_var = Column(String, nullable=False)  # Environment variable name for API key
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    config = Column(JSON, nullable=True)  # Additional provider-specific configuration

    # Relationships
    models = relationship("AIModel", back_populates="provider", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ModelProvider {self.name}>"


class AIModel(Base):
    """Model for AI models available in the system."""

    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # @important: Model identifier (e.g., "mistral-medium")
    display_name = Column(String, nullable=False)  # Human-readable name (e.g., "Mistral Medium")
    provider_id = Column(Integer, ForeignKey("model_providers.id"), nullable=False)
    model_type = Column(String, nullable=False)  # e.g., "text", "vision", "audio"
    capabilities = Column(JSON, nullable=True)  # List of capabilities (e.g., ["chat", "completion"])
    context_window = Column(Integer, nullable=True)  # Maximum context window size
    status = Column(String, default=ModelStatus.ACTIVE.value)
    is_default = Column(Boolean, default=False)  # Whether this is the default model for its type
    cost_per_1k_input_tokens = Column(Float, default=0.0)  # Cost per 1000 input tokens
    cost_per_1k_output_tokens = Column(Float, default=0.0)  # Cost per 1000 output tokens
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    config = Column(JSON, nullable=True)  # Model-specific configuration

    # Relationships
    provider = relationship("ModelProvider", back_populates="models")
    
    def __repr__(self):
        return f"<AIModel {self.name} ({self.provider.name})>"


class ModelRequestMapping(Base):
    """Mapping between Peer AI's unified API and provider-specific API parameters."""

    __tablename__ = "model_request_mappings"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    peer_param = Column(String, nullable=False)  # Peer AI parameter name
    provider_param = Column(String, nullable=False)  # Provider-specific parameter name
    transform_function = Column(String, nullable=True)  # Optional function name to transform values
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    model = relationship("AIModel")
    
    def __repr__(self):
        return f"<ModelRequestMapping {self.peer_param} -> {self.provider_param}>" 