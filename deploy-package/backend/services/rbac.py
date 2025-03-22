from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.auth import User, Team
from schemas.rbac import TeamCreate
from core.roles import Role, Permission, has_permission


class RBACService:
    @staticmethod
    def create_team(db: Session, team: TeamCreate, created_by_user: User) -> Team:
        """Create a new team"""
        if not has_permission(created_by_user.role, Permission.MANAGE_TEAM_MEMBERS):
            raise HTTPException(
                status_code=403, detail="Not authorized to create teams"
            )

        db_team = Team(name=team.name, created_by_id=created_by_user.id)
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        return db_team

    @staticmethod
    def get_team(db: Session, team_id: int, current_user: User) -> Team:
        """Get team by ID"""
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # Users with MANAGE_ALL_TEAMS permission can access any team
        if has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            return team

        # User admins can only access their own team
        if current_user.team_id != team.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to access this team"
            )

        return team

    @staticmethod
    def update_user_role(
        db: Session, user_id: int, new_role: Role, current_user: User
    ) -> User:
        """Update a user's role"""
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        if has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            # Users with MANAGE_ALL_TEAMS permission can change any role
            pass
        elif has_permission(current_user.role, Permission.MANAGE_TEAM_MEMBERS):
            # User admins can only modify users in their team and can't create super admins
            if (
                target_user.team_id != current_user.team_id
                or new_role == Role.SUPER_ADMIN
            ):
                raise HTTPException(
                    status_code=403, detail="Not authorized to assign this role"
                )
        else:
            raise HTTPException(
                status_code=403, detail="Not authorized to modify user roles"
            )

        target_user.role = new_role
        db.commit()
        db.refresh(target_user)
        return target_user

    @staticmethod
    def add_user_to_team(
        db: Session, user_id: int, team_id: int, current_user: User
    ) -> User:
        """Add a user to a team"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # Check permissions
        if has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            # Users with MANAGE_ALL_TEAMS permission can add users to any team
            pass
        elif has_permission(current_user.role, Permission.MANAGE_TEAM_MEMBERS):
            # User admins can only add users to their own team
            if current_user.team_id != team_id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to add users to this team"
                )
        else:
            raise HTTPException(
                status_code=403, detail="Not authorized to modify team membership"
            )

        user.team_id = team_id
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def remove_user_from_team(db: Session, user_id: int, current_user: User) -> User:
        """Remove a user from their team"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        if has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            # Users with MANAGE_ALL_TEAMS permission can remove users from any team
            pass
        elif has_permission(current_user.role, Permission.MANAGE_TEAM_MEMBERS):
            # User admins can only remove users from their own team
            if current_user.team_id != user.team_id:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to remove users from this team",
                )
        else:
            raise HTTPException(
                status_code=403, detail="Not authorized to modify team membership"
            )

        user.team_id = None
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_team_members(db: Session, team_id: int, current_user: User) -> List[User]:
        """Get all members of a team"""
        # Check permissions
        if has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            # Users with MANAGE_ALL_TEAMS permission can view any team's members
            pass
        elif has_permission(current_user.role, Permission.MANAGE_TEAM_MEMBERS):
            # User admins can only view their own team's members
            if current_user.team_id != team_id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to view this team's members"
                )
        else:
            raise HTTPException(
                status_code=403, detail="Not authorized to view team members"
            )

        return db.query(User).filter(User.team_id == team_id).all()
