import pytest
from unittest.mock import MagicMock
from datetime import datetime, timedelta
from jose import jwt

from backend.main import app
from backend.database import get_db
from backend.models import User, APIKey
from backend.core.security import get_password_hash
from sqlalchemy.orm import Session

from backend.main import settings
from backend.routes.auth import ALGORITHM, SECRET_KEY


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
        is_active=True,
    )


@pytest.fixture
def test_api_key():
    """Create a test API key"""
    return APIKey(id=1, key="test_key_123", name="Test Key", user_id=1, is_active=True)


@pytest.fixture
def test_db(session: Session):
    """Fixture for test database session"""
    # Create test user
    hashed_password = get_password_hash("testpass123")
    test_user = User(
        email="test@peerdigital.se", hashed_password=hashed_password, is_active=True
    )
    session.add(test_user)
    session.commit()

    yield session

    # Cleanup
    session.query(User).filter(User.email == "test@peerdigital.se").delete()
    session.commit()


@pytest.mark.asyncio
async def test_register_user_success(db_session, async_client):
    """Test successful user registration"""
    # Mock database to return None (user doesn't exist)
    db_session.query.return_value.filter.return_value.first.return_value = None

    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "new@example.com",
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
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "new@example.com"


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
        json={"email": "test@peerdigital.se", "password": "testpass123"},
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
        json={"email": "test@peerdigital.se", "password": "wrongpass"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_validate_token(test_db, async_client):
    """Test token validation"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@peerdigital.se", "password": "testpass123"},
    )
    token = login_response.json()["access_token"]

    # Test token validation
    response = await async_client.get(
        "/api/v1/auth/validate", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@peerdigital.se"


@pytest.mark.asyncio
async def test_logout(test_db, async_client):
    """Test logout endpoint"""
    # First login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@peerdigital.se", "password": "testpass123"},
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
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
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
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
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
async def test_list_api_keys(db_session, test_user, test_api_key, async_client):
    """Test listing API keys"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    db_session.query.return_value.filter.return_value.all.return_value = [test_api_key]

    response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["key"] == test_api_key.key


@pytest.mark.asyncio
async def test_delete_api_key_success(
    db_session, test_user, test_api_key, async_client
):
    """Test successful API key deletion"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.side_effect = [
        test_user,
        test_api_key,
    ]

    response = await async_client.delete(
        f"{settings.API_V1_PREFIX}/auth/api-keys/{test_api_key.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_delete_api_key_not_found(db_session, test_user, async_client):
    """Test deleting non-existent API key"""
    token = jwt.encode({"sub": test_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    db_session.query.return_value.filter.return_value.first.side_effect = [
        test_user,
        None,
    ]

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
        {"sub": test_user.email, "exp": expired_time}, SECRET_KEY, algorithm=ALGORITHM
    )

    response = await async_client.get(
        f"{settings.API_V1_PREFIX}/auth/api-keys",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
