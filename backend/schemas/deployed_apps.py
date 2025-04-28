"""
Schemas for deployed AI apps.
"""
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class DeployedAppBase(BaseModel):
    template_id: int
    team_id: Optional[int] = None
    name: str
    slug: str
    configuration: Optional[Dict[str, Any]] = None
    custom_code: Optional[str] = None
    public_url: Optional[str] = None
    is_active: bool = True


class DeployedAppCreate(DeployedAppBase):
    pass


class DeployedAppUpdate(BaseModel):
    name: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    custom_code: Optional[str] = None
    public_url: Optional[str] = None
    is_active: Optional[bool] = None


class DeployedAppResponse(DeployedAppBase):
    id: int
    deployed_by_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class DeployedAppDetailResponse(DeployedAppResponse):
    template: Dict[str, Any] = Field(...)  # Template details
    deployed_by: Dict[str, Any] = Field(...)  # User details
    team: Optional[Dict[str, Any]] = None  # Team details if applicable
