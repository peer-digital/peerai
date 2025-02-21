import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from jose import jwt

from api.main import app, settings
from api.database import get_db
from api.models.auth import User, APIKey
from api.routes.auth import ALGORITHM, SECRET_KEY

# Test client setup
client = TestClient(app)

# Mock database session
@pytest.fixture
def db_session():
    """Create a mock database session"""
    session = MagicMock()
    
    def get_test_db():
        try:
            yield session
        finally:
            session.close()
    
    app.dependency_overrides[get_db] = get_test_db
    return session

@pytest.fixture
def test_user():
    """Create a test user"""
    return User(
        id=1,
        email="test@example.com",
        hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGpJ4vZKkOS",  # Password: test123
        full_name="Test User",
        is_active=True
    )

@pytest.fixture
def test_api_key():
    """Create a test API key"""
    return APIKey(
        id=1,
        key="test_key_123",
        name="Test Key",
        user_id=1,
        is_active=True
    )

def test_register_user_success(db_session):
    """Test successful user registration"""
    # Mock database to return None (user doesn't exist)
    db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/register",
        json={
            "email": "new@example.com",
            "password": "newpass123",
            "full_name": "New User"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify token
    token = data["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "new@example.com"

def test_register_user_duplicate_email(db_session, test_user):
    """Test registration with existing email"""
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/register",
        json={
            "email": "test@example.com",
            "password": "test123",
            "full_name": "Test User"
        }
    )
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_success(db_session, test_user):
    """Test successful login"""
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/token",
        data={
            "username": "test@example.com",
            "password": "test123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(db_session):
    """Test login with invalid credentials"""
    db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/token",
        data={
            "username": "wrong@example.com",
            "password": "wrongpass"
        }
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_create_api_key_success(db_session, test_user):
    """Test successful API key creation"""
    # Mock authentication
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Key",
            "expires_in_days": 30
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert data["name"] == "New Key"
    assert "expires_at" in data

def test_create_api_key_no_expiry(db_session, test_user):
    """Test API key creation without expiry"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Permanent Key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["expires_at"] is None

def test_list_api_keys(db_session, test_user, test_api_key):
    """Test listing API keys"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    db_session.query.return_value.filter.return_value.all.return_value = [test_api_key]
    
    response = client.get(
        f"{settings.API_V1_PREFIX}/api-keys",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["key"] == test_api_key.key

def test_delete_api_key_success(db_session, test_user, test_api_key):
    """Test successful API key deletion"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.side_effect = [test_user, test_api_key]
    
    response = client.delete(
        f"{settings.API_V1_PREFIX}/api-keys/{test_api_key.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_delete_api_key_not_found(db_session, test_user):
    """Test deleting non-existent API key"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.side_effect = [test_user, None]
    
    response = client.delete(
        f"{settings.API_V1_PREFIX}/api-keys/999",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    assert response.json()["detail"] == "API key not found"

def test_invalid_token(db_session):
    """Test accessing protected endpoint with invalid token"""
    response = client.get(
        f"{settings.API_V1_PREFIX}/api-keys",
        headers={"Authorization": "Bearer invalid_token"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"

def test_expired_token(db_session, test_user):
    """Test accessing protected endpoint with expired token"""
    # Create expired token
    expire = datetime.utcnow() - timedelta(minutes=30)
    token = jwt.encode(
        {"sub": test_user.email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    response = client.get(
        f"{settings.API_V1_PREFIX}/api-keys",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials" 