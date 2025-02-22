import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio

from backend.main import app
from backend.database import get_db
from backend.models.auth import User, APIKey
from backend.core.security import get_password_hash
from tests.test_db_integration import engine, db_session

client = TestClient(app)

@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="test@peerai.se",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        is_active=True,
        is_superuser=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def db_session():
    """Create a mock database session"""
    session = MagicMock()
    
    # Configure the mock to handle chained calls
    query_mock = MagicMock()
    filter_mock = MagicMock()
    first_mock = MagicMock()
    
    session.query = MagicMock(return_value=query_mock)
    query_mock.filter = MagicMock(return_value=filter_mock)
    filter_mock.first = MagicMock(return_value=first_mock)
    
    def get_test_db():
        try:
            yield session
        finally:
            session.close()
    
    app.dependency_overrides[get_db] = get_test_db
    return session

@pytest.fixture
def test_api_key():
    """Create a test API key"""
    return APIKey(
        id=1,
        key="test_key_123",
        name="Test Key",
        user_id=1,
        is_active=True,
        daily_limit=1000,
        minute_limit=60,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )

@pytest.fixture(scope="function")
async def auth_headers(test_user, async_client):
    """Get authentication headers"""
    # Login to get token
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_complete_auth_flow(async_client):
    """Test complete authentication flow"""
    # Register new user
    register_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@peerai.se",
            "password": "newpass123",
            "full_name": "New User"
        }
    )
    assert register_response.status_code == 200
    register_data = register_response.json()
    assert "access_token" in register_data

    # Login with new user
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "new@peerai.se",
            "password": "newpass123"
        }
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data

    # Use token to access protected endpoint
    token = login_data["access_token"]
    profile_response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["email"] == "new@peerai.se"

@pytest.mark.asyncio
async def test_api_key_management(db_session, test_user, user_token, async_client):
    """Test API key management"""
    # Configure mock to return test_user for authentication
    db_session.query.return_value.filter.return_value.first.return_value = test_user
    
    # Create API key
    response = await async_client.post(
        "/api/v1/auth/api-keys",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"name": "Test Key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert data["name"] == "Test Key"
    
    # List API keys
    response = await async_client.get(
        "/api/v1/auth/api-keys",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Revoke API key
    key_id = data[0]["id"]
    response = await async_client.delete(
        f"/api/v1/auth/api-keys/{key_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_error_handling(db_session, test_api_key, async_client):
    """Test error handling"""
    # Invalid API key
    response = await async_client.post(
        "/api/v1/completions",
        headers={"X-API-Key": "invalid_key"},
        json={"prompt": "Test"}
    )
    assert response.status_code == 401

    # Rate limit exceeded
    db_session.query.return_value.filter.return_value.first.return_value = test_api_key
    db_session.query.return_value.filter.return_value.count.return_value = test_api_key.minute_limit + 1

    response = await async_client.post(
        "/api/v1/completions",
        headers={"X-API-Key": test_api_key.key},
        json={"prompt": "Test"}
    )
    assert response.status_code == 429

@pytest.mark.asyncio
async def test_concurrent_requests(db_session, test_api_key, async_client):
    """Test handling concurrent requests"""
    db_session.query.return_value.filter.return_value.first.return_value = test_api_key

    async def make_request():
        response = await async_client.post(
            "/api/v1/completions",
            headers={"X-API-Key": test_api_key.key},
            json={
                "prompt": "Test concurrent requests",
                "max_tokens": 50,
                "mock_mode": True
            }
        )
        return response.status_code

    tasks = [make_request() for _ in range(5)]
    results = await asyncio.gather(*tasks)

    # All requests should succeed
    assert all(status == 200 for status in results)

@pytest.mark.asyncio
async def test_admin_functionality(db_session, admin_user, admin_token, async_client):
    """Test admin-only functionality"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    # Test admin-only endpoint
    response = await async_client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

    # Test non-admin access
    response = await async_client.get(
        "/api/v1/admin/users",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_inference_endpoints(test_api_key, async_client):
    """Test inference endpoints"""
    headers = {"X-API-Key": test_api_key.key}

    # Test text completion
    completion_response = await async_client.post(
        "/api/v1/completions",
        headers=headers,
        json={
            "prompt": "What is machine learning?",
            "max_tokens": 100,
            "temperature": 0.7,
            "mock_mode": True
        }
    )
    assert completion_response.status_code == 200
    assert "text" in completion_response.json()

    # Test vision API (beta)
    vision_response = await async_client.post(
        "/api/v1/vision",
        headers=headers,
        json={
            "image_url": "https://example.com/test.jpg",
            "prompt": "Describe this image",
            "mock_mode": True
        }
    )
    assert vision_response.status_code == 200
    assert "text" in vision_response.json()
    assert "detected_objects" in vision_response.json()["additional_data"]

    # Test audio API (beta)
    audio_response = await async_client.post(
        "/api/v1/audio",
        headers=headers,
        json={
            "audio_url": "https://example.com/test.mp3",
            "task": "transcribe",
            "mock_mode": True
        }
    )
    assert audio_response.status_code == 200
    assert "text" in audio_response.json()

@pytest.mark.asyncio
async def test_websocket_connection(test_api_key, async_client):
    """Test WebSocket connection for streaming responses"""
    async with async_client.websocket_connect(
        f"/api/v1/stream?api_key={test_api_key.key}"
    ) as websocket:
        # Send a test message with mock mode
        await websocket.send_json({
            "prompt": "Test streaming",
            "mock_mode": True
        })
        
        # Receive response
        data = await websocket.receive_json()
        assert "text" in data
        assert data["status"] == "completed" 