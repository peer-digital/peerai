import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timedelta
import json

from backend.main import app, settings
from backend.database import get_db
from backend.models import User, APIKey, UsageRecord
from backend.core.security import get_password_hash
from backend.routes.inference import MOCK_TEXT_RESPONSES, websocket_endpoint

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

@pytest.mark.asyncio
async def test_health_check(async_client):
    """Test health check endpoint"""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_completion_endpoint_mock_mode(async_client):
    """Test completion request with mock mode"""
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={
            "prompt": "Test prompt",
            "max_tokens": 100,
            "temperature": 0.7,
            "mock_mode": True
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["choices"][0]["message"]["content"] in MOCK_TEXT_RESPONSES
    assert data["provider"] == "mock-gpt4"
    assert data["model"] == "mock-gpt4"
    assert data["usage"]["total_tokens"] > 0
    assert data["latency_ms"] >= 0
    assert data["additional_data"]["confidence"] == 0.92

@pytest.mark.asyncio
async def test_completion_endpoint_mistral(db_session, async_client):
    """Test completion request with Mistral API"""
    from backend.models.auth import APIKey
    from datetime import datetime, timedelta

    # Create a test API key
    api_key = APIKey(
        key="test_key_123",
        name="Test Key",
        user_id=1,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.query.return_value.filter.return_value.first.return_value = api_key

    # Mock successful Mistral response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.elapsed.total_seconds.return_value = 0.5
    mock_response.json.return_value = {
        "id": "cmpl-123",
        "object": "chat.completion",
        "created": 1679914100,
        "model": "mistral-tiny",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Test response from Mistral"
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 20,
            "completion_tokens": 30,
            "total_tokens": 50
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        response = await async_client.post(
            "/api/v1/completions",
            headers={"X-API-Key": "test_key_123"},
            json={
                "prompt": "Test prompt",
                "max_tokens": 100,
                "temperature": 0.7
            }
        )

    assert response.status_code == 200
    data = response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["choices"][0]["message"]["content"] == "Test response from Mistral"
    assert data["model"] == "mistral-tiny"
    assert data["usage"]["total_tokens"] == 50
    assert data["latency_ms"] >= 0

@pytest.mark.asyncio
async def test_completion_invalid_api_key(db_session, async_client):
    """Test completion with invalid API key"""
    # Mock database query to return None for invalid key
    db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "invalid_key"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API key"

@pytest.mark.asyncio
async def test_completion_invalid_request(async_client):
    """Test invalid request validation"""
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={
            "prompt": "Test prompt",
            "temperature": 2.0  # Invalid temperature
        }
    )
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_rate_limiting(db_session, test_api_key, async_client):
    """Test rate limiting functionality"""
    from backend.models.auth import APIKey
    from datetime import datetime, timedelta

    # Mock API key with low limits
    api_key = APIKey(
        id=2,
        key="limited_key",
        name="Limited Key",
        user_id=1,
        is_active=True,
        daily_limit=2,
        minute_limit=1
    )

    # Configure mock query results
    query_mock = MagicMock()
    filter_mock = MagicMock()
    
    # First request - should succeed
    filter_mock.first.return_value = api_key
    filter_mock.count.return_value = 0  # No previous requests
    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    response1 = await async_client.post(
        "/api/v1/completions",
        headers={"X-API-Key": "limited_key"},
        json={
            "prompt": "Test prompt",
            "mock_mode": True
        }
    )
    assert response1.status_code == 200

    # Second request - should fail (minute limit exceeded)
    filter_mock.first.return_value = api_key
    filter_mock.count.return_value = 2  # Minute limit exceeded
    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    response2 = await async_client.post(
        "/api/v1/completions",
        headers={"X-API-Key": "limited_key"},
        json={
            "prompt": "Test prompt",
            "mock_mode": True
        }
    )
    assert response2.status_code == 429
    assert "Rate limit exceeded" in response2.json()["detail"]

@pytest.mark.asyncio
async def test_vision_endpoint_mock(async_client):
    """Test vision endpoint with mock mode"""
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/vision",
        headers={"X-API-Key": "test_key_123"},
        json={
            "image_url": "https://example.com/image.jpg",
            "prompt": "Describe this image",
            "mock_mode": True
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["provider"] == "mock-gpt4v"
    assert data["model"] == "mock-gpt4v"
    assert "detected_objects" in data["additional_data"]

@pytest.mark.asyncio
async def test_audio_endpoint_mock(async_client):
    """Test audio endpoint with mock mode"""
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/audio",
        headers={"X-API-Key": "test_key_123"},
        json={
            "audio_url": "https://example.com/audio.mp3",
            "task": "transcribe",
            "mock_mode": True
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["provider"] == "mock-whisper"
    assert data["model"] == "mock-whisper"
    assert "language" in data["additional_data"]
    assert "speakers" in data["additional_data"]

@pytest.mark.asyncio
async def test_usage_tracking(db_session, async_client):
    """Test usage tracking functionality"""
    # Create a non-test API key for usage tracking
    api_key = APIKey(
        id=2,
        key="track_key",
        name="Tracking Key",
        user_id=1,
        is_active=True,
        daily_limit=1000,
        minute_limit=60
    )
    db_session.query.return_value.filter.return_value.first.return_value = api_key
    
    # Mock rate limit checks to return low counts
    db_session.query.return_value.filter.return_value.count.return_value = 0
    
    response = await async_client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "track_key"},
        json={
            "prompt": "Test prompt",
            "mock_mode": True
        }
    )
    
    assert response.status_code == 200
    # Verify usage record was created
    db_session.add.assert_called_once()
    usage_record = db_session.add.call_args[0][0]
    assert isinstance(usage_record, UsageRecord)
    assert usage_record.endpoint == "/completions"
    assert usage_record.tokens_used > 0 

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
    data = completion_response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["model"] == "mock-gpt4"
    assert data["usage"]["total_tokens"] > 0

    # Test vision endpoint
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
    data = vision_response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert "detected_objects" in data["additional_data"]

    # Test audio endpoint
    audio_response = await async_client.post(
        "/api/v1/audio",
        headers=headers,
        json={
            "audio_url": "https://example.com/audio.mp3",
            "task": "transcribe",
            "mock_mode": True
        }
    )
    assert audio_response.status_code == 200
    data = audio_response.json()
    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert "language" in data["additional_data"]
    assert "speakers" in data["additional_data"]

@pytest.mark.asyncio
async def test_websocket_connection(db_session, test_api_key, websocket):
    """Test WebSocket connection for streaming responses"""
    db_session.query.return_value.filter.return_value.first.return_value = test_api_key

    # Test the websocket endpoint
    await websocket_endpoint(
        websocket=websocket,
        api_key=test_api_key.key,
        db=db_session
    )

    # Verify the websocket lifecycle
    assert websocket.accepted  # Connection was accepted
    assert websocket.closed   # Connection was properly closed
    assert len(websocket.messages) > 0  # Messages were sent
    
    # Verify message format
    message = websocket.messages[0]
    assert "choices" in message
    assert len(message["choices"]) > 0
    assert "message" in message["choices"][0]
    assert "content" in message["choices"][0]["message"]
    assert message["model"] == "mock-gpt4"
    assert message["usage"]["total_tokens"] > 0
    assert message["latency_ms"] >= 0
    assert message["additional_data"]["confidence"] == 0.92 