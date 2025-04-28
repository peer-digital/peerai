from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AIAppBase(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    app_url: str
    tags: Optional[List[str]] = None


class AIAppCreate(AIAppBase):
    pass


class AIAppUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    app_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AIAppResponse(AIAppBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True