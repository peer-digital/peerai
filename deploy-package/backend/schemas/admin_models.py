"""
Admin schemas for Model Management in PeerAI API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class ModelStatusEnum(str, Enum):
    """Status of a model in the registry."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    BETA = "beta"

class AIModelBase(BaseModel):
    """Base model for AI models."""
    name: str
    display_name: str
    provider_id: int
    model_type: str
    capabilities: Optional[List[str]] = []
    context_window: Optional[int] = None
    status: str = ModelStatusEnum.ACTIVE
    is_default: bool = False
    cost_per_1k_input_tokens: float = 0.0
    cost_per_1k_output_tokens: float = 0.0
    config: Optional[Dict[str, Any]] = {}

class AIModelCreate(AIModelBase):
    """Request model for creating a new AI model."""
    pass

class AIModelUpdate(BaseModel):
    """Request model for updating an AI model."""
    name: Optional[str] = None
    display_name: Optional[str] = None
    provider_id: Optional[int] = None
    model_type: Optional[str] = None
    capabilities: Optional[List[str]] = None
    context_window: Optional[int] = None
    status: Optional[str] = None
    is_default: Optional[bool] = None
    cost_per_1k_input_tokens: Optional[float] = None
    cost_per_1k_output_tokens: Optional[float] = None
    config: Optional[Dict[str, Any]] = None

class AIModelResponse(AIModelBase):
    """Response model for AI models."""
    id: int
    
    class Config:
        from_attributes = True

class ModelProviderResponse(BaseModel):
    """Response model for model providers."""
    id: int
    name: str
    display_name: str
    api_base_url: str
    api_key_env_var: str
    is_active: bool
    config: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True 