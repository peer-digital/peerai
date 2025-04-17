"""
Schemas for app templates.
"""
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class AppTemplateBase(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    template_config: Dict[str, Any]
    template_code: str
    tags: Optional[List[str]] = None
    is_active: bool = True


class AppTemplateCreate(AppTemplateBase):
    pass


class AppTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    template_config: Optional[Dict[str, Any]] = None
    template_code: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AppTemplateResponse(AppTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
