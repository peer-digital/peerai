import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timedelta

from api.main import app, settings
from api.database import get_db
from api.models.auth import APIKey, UsageRecord
from api.routes.inference import MOCK_TEXT_RESPONSES

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

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_completion_endpoint_mock_mode():
    """Test completion request with mock mode"""
    response = client.post(
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
    assert data["text"] in MOCK_TEXT_RESPONSES
    assert data["provider"] == "mock-gpt4"
    assert data["tokens_used"] > 0
    assert data["latency_ms"] >= 0
    assert data["confidence"] == 0.92

@pytest.mark.asyncio
async def test_completion_endpoint_mistral(db_session):
    """Test completion request with Mistral API"""
    # Mock successful Mistral response
    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.elapsed.total_seconds.return_value = 0.5
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Test response from Mistral"
            }
        }],
        "usage": {
            "total_tokens": 50
        }
    }
    
    async def mock_post(*args, **kwargs):
        return mock_response
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_post)):
        response = client.post(
            f"{settings.API_V1_PREFIX}/completions",
            headers={"X-API-Key": "test_key_123"},
            json={
                "prompt": "Test prompt",
                "max_tokens": 100,
                "temperature": 0.7
            }
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "Test response from Mistral"
    assert data["provider"] == "mistral"
    assert data["tokens_used"] == 50
    assert data["latency_ms"] >= 0
    assert data["confidence"] == 0.9

def test_completion_invalid_api_key(db_session):
    """Test completion with invalid API key"""
    # Mock database query to return None for invalid key
    db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "invalid_key"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API key"

def test_completion_invalid_request():
    """Test invalid request validation"""
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={
            "prompt": "Test prompt",
            "temperature": 2.0  # Invalid temperature
        }
    )
    
    assert response.status_code == 422  # Validation error

def test_rate_limiting(db_session):
    """Test rate limiting functionality"""
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
    
    # Set up the mock to return our API key
    db_session.query.return_value.filter.return_value.first.return_value = api_key
    
    # First request - should succeed (no previous usage)
    db_session.query.return_value.filter.return_value.count.return_value = 0
    response1 = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "limited_key"},
        json={
            "prompt": "Test prompt",
            "mock_mode": True
        }
    )
    assert response1.status_code == 200
    
    # Second request - should fail (minute limit = 1)
    db_session.query.return_value.filter.return_value.count.return_value = 1
    response2 = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "limited_key"},
        json={
            "prompt": "Test prompt",
            "mock_mode": True
        }
    )
    assert response2.status_code == 429
    assert "Rate limit exceeded" in response2.json()["detail"]

def test_vision_endpoint_mock():
    """Test vision endpoint with mock mode"""
    response = client.post(
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
    assert "text" in data
    assert data["provider"] == "mock-gpt4v"
    assert "detected_objects" in data["additional_data"]

def test_audio_endpoint_mock():
    """Test audio endpoint with mock mode"""
    response = client.post(
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
    assert "text" in data
    assert data["provider"] == "mock-whisper"
    assert data["additional_data"]["language"] == "en"

def test_usage_tracking(db_session):
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
    
    response = client.post(
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