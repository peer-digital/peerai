import pytest
from unittest.mock import MagicMock
from datetime import datetime, timedelta
from jose import jwt

from backend.main import app
from backend.database import get_db
from backend.models.auth import User, APIKey
from backend.core.security import get_password_hash
from sqlalchemy.orm import Session
from backend.core.roles import Role  # Import Role enum

from backend.main import settings
from backend.routes.auth import ALGORITHM, JWT_SECRET_KEY


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
    """
    Create a test user
    
    Note: To create a superuser, set role=Role.SUPER_ADMIN
    The is_superuser property is READ-ONLY and computed from the role field.
    """
    return User(
        id=1,
        email="test@example.com",
        hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGpJ4vZKkOS",  # Password: test123
        full_name="Test User",
        is_active=True,
        # To create a superuser: role=Role.SUPER_ADMIN
    )


@pytest.fixture
def test_api_key():
    """Create a test API key"""
    return APIKey(id=1, key="test_key_123", name="Test Key", user_id=1, is_active=True)


@pytest.fixture
def test_db(session: Session):
    """Fixture for test database session"""
    # Create test user
    hashed_password = get_password_hash("test123")
    test_user = User(
        email="test@peerai.se", hashed_password=hashed_password, is_active=True
    )
    session.add(test_user)
    session.commit()

    yield session

    # Cleanup - first delete API keys, then users
    session.query(APIKey).delete()
    session.query(User).delete()
    session.commit()


@pytest.mark.asyncio
async def test_register_user_success(test_db, async_client):
    """Test successful user registration"""
    # Use a unique email that doesn't exist in the database
    unique_email = f"new_user_{datetime.utcnow().timestamp()}@example.com"
    
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": unique_email,
            "password": "newpass123",
            "full_name": "New User",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Verify token
    token = data["access_token"]
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == unique_email


@pytest.mark.asyncio
async def test_register_user_duplicate_email(db_session, test_user, async_client):
    """Test registration with existing email"""
    db_session.query.return_value.filter.return_value.first.return_value = test_user

    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "test@example.com",
            "password": "test123",
            "full_name": "Test User",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_login_success(test_db, async_client):
    """Test successful login"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(test_db, async_client):
    """Test login with invalid credentials"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "wrongpass"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_validate_token(test_db, async_client):
    """Test token validation"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    token = login_response.json()["access_token"]

    # Test token validation
    response = await async_client.get(
        "/api/v1/auth/validate", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@peerai.se"


@pytest.mark.asyncio
async def test_logout(test_db, async_client):
    """Test logout endpoint"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    token = login_response.json()["access_token"]

    # Test logout
    response = await async_client.post(
        "/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"


@pytest.mark.asyncio
async def test_create_api_key_success(db_session, test_user, async_client):
    """Test successful API key creation"""
    # Mock authentication
    token = jwt.encode({"sub": test_user.email}, JWT_SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user

    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "New Key", "expires_in_days": 30},
    )

    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert data["name"] == "New Key"
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_create_api_key_no_expiry(db_session, test_user, async_client):
    """Test API key creation without expiry"""
    token = jwt.encode({"sub": test_user.email}, JWT_SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user

    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Permanent Key"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["expires_at"] is None


@pytest.mark.asyncio
async def test_list_api_keys(test_db, test_user, async_client):
    """Test listing API keys"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    token = login_response.json()["access_token"]
    
    # Create a test API key
    api_key = APIKey(
        key="test_key_123",
        name="Test Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30),
        daily_limit=1000,
        minute_limit=60,
    )
    test_db.add(api_key)
    test_db.commit()

    response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    # We expect exactly one API key
    assert len(data) == 1
    assert data[0]["key"] == "test_key_123"


@pytest.mark.asyncio
async def test_delete_api_key_success(test_db, async_client):
    """Test successful API key deletion"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    token = login_response.json()["access_token"]
    
    # Create a test API key using the API
    create_response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Test Key To Delete", "expires_in_days": 30},
    )
    assert create_response.status_code == 200
    print(f"Create API key response: {create_response.json()}")
    
    # List API keys to get the ID
    list_response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    api_keys = list_response.json()
    print(f"API keys for user: {api_keys}")
    
    # Find the API key we just created
    api_key = next((k for k in api_keys if k["name"] == "Test Key To Delete"), None)
    assert api_key is not None, "Could not find the API key we just created"
    key_id = api_key["id"]
    
    # Delete the API key
    response = await async_client.delete(
        f"{settings.API_V1_PREFIX}/auth/api-keys/{key_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    print(f"Delete response: {response.status_code} - {response.text}")

    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_delete_api_key_not_found(test_db, test_user, async_client):
    """Test deleting non-existent API key"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@peerai.se", "password": "test123"},
    )
    token = login_response.json()["access_token"]

    # Use a non-existent key ID
    response = await async_client.delete(
        f"{settings.API_V1_PREFIX}/auth/api-keys/999",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "API key not found"


@pytest.mark.asyncio
async def test_invalid_token(db_session, async_client):
    """Test accessing protected endpoint with invalid token"""
    response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_expired_token(db_session, test_user, async_client):
    """Test accessing protected endpoint with expired token"""
    # Create an expired token
    expired_time = datetime.utcnow() - timedelta(days=1)
    token = jwt.encode(
        {"sub": test_user.email, "exp": expired_time}, JWT_SECRET_KEY, algorithm=ALGORITHM
    )

    response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
