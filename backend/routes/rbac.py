from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.roles import Role, Permission
from core.auth import get_current_user
from database import get_db
from schemas.rbac import Team, TeamCreate, User, UserCreate, UserUpdate, TeamWithMembers
from services.rbac import RBACService

router = APIRouter(prefix="/rbac", tags=["rbac"])

@router.post("/teams", response_model=Team)
def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new team"""
    return RBACService.create_team(db, team, current_user)

@router.get("/teams/{team_id}", response_model=TeamWithMembers)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team details including members"""
    return RBACService.get_team(db, team_id, current_user)

@router.put("/users/{user_id}/role", response_model=User)
def update_user_role(
    user_id: int,
    new_role: Role,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a user's role"""
    return RBACService.update_user_role(db, user_id, new_role, current_user)

@router.post("/teams/{team_id}/members/{user_id}", response_model=User)
def add_user_to_team(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a user to a team"""
    return RBACService.add_user_to_team(db, user_id, team_id, current_user)

@router.delete("/teams/members/{user_id}", response_model=User)
def remove_user_from_team(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a user from their team"""
    return RBACService.remove_user_from_team(db, user_id, current_user)

@router.get("/teams/{team_id}/members", response_model=List[User])
def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all members of a team"""
    return RBACService.get_team_members(db, team_id, current_user) 