"""Authentication schemas for request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class User(UserBase):
    id: int
    is_active: bool = True
    is_superuser: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class APIKeyCreate(BaseModel):
    name: str
    expires_at: Optional[datetime] = None
    daily_limit: Optional[int] = 1000
    minute_limit: Optional[int] = 60


class APIKeyResponse(BaseModel):
    id: int
    key: str
    name: str
    user_id: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    daily_limit: int
    minute_limit: int
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True
