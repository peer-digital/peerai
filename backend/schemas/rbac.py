from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from core.roles import Role


class TeamBase(BaseModel):
    name: str


class TeamCreate(TeamBase):
    pass


class Team(TeamBase):
    id: int
    created_at: datetime
    created_by_id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    role: Role = Role.USER
    team_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[Role] = None
    team_id: Optional[int] = None


class User(UserBase):
    id: int
    role: Role
    team_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TeamWithMembers(Team):
    members: List[User]

    class Config:
        from_attributes = True
