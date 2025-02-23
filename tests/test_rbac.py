import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.core.roles import Role
from backend.models.auth import User, Team
from backend.services.rbac import RBACService
from backend.database import get_db

# Test client setup
client = TestClient(app)

# Test data
test_user_data = {
    "email": "test@example.com",
    "password": "testpassword",
    "full_name": "Test User"
}

test_admin_data = {
    "email": "admin@example.com",
    "password": "adminpassword",
    "full_name": "Admin User",
    "role": Role.USER_ADMIN
}

test_team_data = {
    "name": "Test Team"
}

@pytest.fixture
def db_session():
    """Get DB session"""
    # This should be replaced with your actual test database session
    yield next(get_db())

@pytest.fixture
def test_user(db_session: Session):
    """Create a test user"""
    user = User(
        email=test_user_data["email"],
        hashed_password="hashed_" + test_user_data["password"],
        full_name=test_user_data["full_name"],
        role=Role.USER
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_admin(db_session: Session):
    """Create a test admin"""
    admin = User(
        email=test_admin_data["email"],
        hashed_password="hashed_" + test_admin_data["password"],
        full_name=test_admin_data["full_name"],
        role=Role.USER_ADMIN
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture
def test_team(db_session: Session, test_admin: User):
    """Create a test team"""
    team = Team(
        name=test_team_data["name"],
        created_by_id=test_admin.id
    )
    db_session.add(team)
    db_session.commit()
    db_session.refresh(team)
    return team

def test_create_team(db_session: Session, test_admin: User):
    """Test team creation"""
    team = RBACService.create_team(
        db_session,
        TeamCreate(name=test_team_data["name"]),
        test_admin
    )
    assert team.name == test_team_data["name"]
    assert team.created_by_id == test_admin.id

def test_add_user_to_team(db_session: Session, test_admin: User, test_user: User, test_team: Team):
    """Test adding user to team"""
    updated_user = RBACService.add_user_to_team(
        db_session,
        test_user.id,
        test_team.id,
        test_admin
    )
    assert updated_user.team_id == test_team.id

def test_update_user_role(db_session: Session, test_admin: User, test_user: User):
    """Test updating user role"""
    updated_user = RBACService.update_user_role(
        db_session,
        test_user.id,
        Role.USER_ADMIN,
        test_admin
    )
    assert updated_user.role == Role.USER_ADMIN

def test_get_team_members(db_session: Session, test_admin: User, test_user: User, test_team: Team):
    """Test getting team members"""
    # First add the user to the team
    test_user.team_id = test_team.id
    db_session.commit()
    
    members = RBACService.get_team_members(
        db_session,
        test_team.id,
        test_admin
    )
    assert len(members) == 1
    assert members[0].id == test_user.id

def test_remove_user_from_team(db_session: Session, test_admin: User, test_user: User, test_team: Team):
    """Test removing user from team"""
    # First add the user to the team
    test_user.team_id = test_team.id
    db_session.commit()
    
    updated_user = RBACService.remove_user_from_team(
        db_session,
        test_user.id,
        test_admin
    )
    assert updated_user.team_id is None

def test_unauthorized_team_access(db_session: Session, test_user: User, test_team: Team):
    """Test unauthorized team access"""
    with pytest.raises(Exception) as exc_info:
        RBACService.get_team(db_session, test_team.id, test_user)
    assert "Not authorized" in str(exc_info.value)

def test_unauthorized_role_update(db_session: Session, test_user: User):
    """Test unauthorized role update"""
    with pytest.raises(Exception) as exc_info:
        RBACService.update_user_role(
            db_session,
            test_user.id,
            Role.USER_ADMIN,
            test_user
        )
    assert "Not authorized" in str(exc_info.value) 