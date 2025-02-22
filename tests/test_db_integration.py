import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

from backend.database import Base, engine, get_db
from backend.models.auth import User
from backend.models.auth import APIKey
from backend.core.security import get_password_hash
from backend.config import settings

# Use the configured test database URL
TEST_DATABASE_URL = settings.TEST_DATABASE_URL

@pytest.fixture(scope="function")
def engine():
    """Create a test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        # Remove SQLite-specific arguments
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(engine):
    """Create a test database session"""
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="test@peerai.se",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_api_key(db_session, test_user):
    """Create a test API key"""
    api_key = APIKey(
        key="test_key_123",
        name="Test Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)
    return api_key

def test_create_user(db_session):
    """Test user creation"""
    user = User(
        email="new@peerai.se",
        hashed_password=get_password_hash("newpass123"),
        full_name="New User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == "new@peerai.se"
    assert user.full_name == "New User"
    assert user.is_active is True

def test_update_user(db_session, test_user):
    """Test user update"""
    test_user.full_name = "Updated Name"
    test_user.is_active = False
    db_session.commit()
    db_session.refresh(test_user)

    assert test_user.full_name == "Updated Name"
    assert test_user.is_active is False

def test_delete_user(db_session, test_user):
    """Test user deletion"""
    user_id = test_user.id
    db_session.delete(test_user)
    db_session.commit()

    deleted_user = db_session.query(User).filter(User.id == user_id).first()
    assert deleted_user is None

def test_create_api_key(db_session, test_user):
    """Test API key creation"""
    api_key = APIKey(
        key="new_key_456",
        name="New Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)

    assert api_key.id is not None
    assert api_key.key == "new_key_456"
    assert api_key.user_id == test_user.id
    assert api_key.is_active is True

def test_deactivate_api_key(db_session, test_api_key):
    """Test API key deactivation"""
    test_api_key.is_active = False
    db_session.commit()
    db_session.refresh(test_api_key)

    assert test_api_key.is_active is False

def test_cascade_delete_api_keys(db_session, test_user, test_api_key):
    """Test that API keys are deleted when user is deleted"""
    user_id = test_user.id
    api_key_id = test_api_key.id

    # Delete user
    db_session.delete(test_user)
    db_session.commit()

    # Check that both user and API key are deleted
    deleted_user = db_session.query(User).filter(User.id == user_id).first()
    deleted_key = db_session.query(APIKey).filter(APIKey.id == api_key_id).first()

    assert deleted_user is None
    assert deleted_key is None

def test_user_relationships(db_session, test_user, test_api_key):
    """Test user relationships"""
    # Test user.api_keys relationship
    assert len(test_user.api_keys) == 1
    assert test_user.api_keys[0].key == "test_key_123"

    # Add another API key
    new_key = APIKey(
        key="another_key_789",
        name="Another Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(new_key)
    db_session.commit()
    db_session.refresh(test_user)

    assert len(test_user.api_keys) == 2

def test_api_key_expiration(db_session, test_user):
    """Test API key expiration"""
    # Create expired key
    expired_key = APIKey(
        key="expired_key_999",
        name="Expired Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() - timedelta(days=1)
    )
    db_session.add(expired_key)
    db_session.commit()

    # Create active key
    active_key = APIKey(
        key="active_key_111",
        name="Active Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(active_key)
    db_session.commit()

    # Query active keys
    active_keys = db_session.query(APIKey).filter(
        APIKey.user_id == test_user.id,
        APIKey.is_active == True,
        APIKey.expires_at > datetime.utcnow()
    ).all()

    assert len(active_keys) == 1
    assert active_keys[0].key == "active_key_111"

def test_unique_constraints(db_session, test_user):
    """Test unique constraints"""
    from sqlalchemy.exc import IntegrityError
    from backend.models.auth import User, APIKey
    from backend.core.security import get_password_hash
    from datetime import datetime, timedelta

    # Try to create user with duplicate email
    duplicate_user = User(
        email=test_user.email,  # Same as test_user
        hashed_password=get_password_hash("pass123"),
        full_name="Duplicate User",
        is_active=True
    )
    db_session.add(duplicate_user)

    with pytest.raises(IntegrityError, match="duplicate key value violates unique constraint"):
        db_session.flush()
    db_session.rollback()

    # Try to create API key with duplicate key
    api_key = APIKey(
        key="test_key_123",
        name="Test Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(api_key)
    db_session.flush()

    duplicate_key = APIKey(
        key="test_key_123",  # Same as api_key
        name="Duplicate Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(duplicate_key)

    with pytest.raises(IntegrityError, match="duplicate key value violates unique constraint"):
        db_session.flush()
    db_session.rollback()

def test_bulk_operations(db_session):
    """Test bulk database operations"""
    # Bulk insert users
    users = [
        User(
            email=f"user{i}@peerai.se",
            hashed_password=get_password_hash(f"pass{i}"),
            full_name=f"User {i}",
            is_active=True
        )
        for i in range(5)
    ]
    db_session.bulk_save_objects(users)
    db_session.commit()

    # Verify users were created
    user_count = db_session.query(User).count()
    assert user_count == 5

    # Bulk update
    db_session.query(User).update({User.is_active: False})
    db_session.commit()

    # Verify update
    inactive_count = db_session.query(User).filter(User.is_active == False).count()
    assert inactive_count == 5

    # Bulk delete
    db_session.query(User).delete()
    db_session.commit()

    # Verify deletion
    final_count = db_session.query(User).count()
    assert final_count == 0 