import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from api.main import app, settings
from api.models.auth import User, APIKey
from api.database import get_db

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
def test_api_key(db_session):
    """Create a test API key"""
    user = User(
        id=1,
        email="test@example.com",
        hashed_password="test",
        is_active=True
    )
    
    api_key = APIKey(
        id=1,
        key="test_key_123",
        name="Test Key",
        user_id=1,
        is_active=True,
        daily_limit=1000,
        minute_limit=60
    )
    
    db_session.query().filter().first.side_effect = [api_key]
    db_session.query().filter().count.return_value = 0  # No rate limit exceeded
    
    return api_key

def test_completion_endpoint_success(db_session, test_api_key):
    """Test successful completion request"""
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
    assert "text" in data
    assert "provider" in data
    assert "tokens_used" in data
    assert "latency_ms" in data

def test_completion_invalid_api_key(db_session):
    """Test completion with invalid API key"""
    db_session.query().filter().first.return_value = None
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "invalid_key"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API key"

def test_completion_rate_limit_minute(db_session, test_api_key):
    """Test minute-based rate limiting"""
    db_session.query().filter().count.return_value = 61  # Exceed minute limit
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 429
    assert "rate limit exceeded" in response.json()["detail"].lower()

def test_completion_rate_limit_daily(db_session, test_api_key):
    """Test daily rate limiting"""
    # First check passes (minute), second fails (daily)
    db_session.query().filter().count.side_effect = [0, 1001]
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 429
    assert "rate limit exceeded" in response.json()["detail"].lower()

@patch("api.routes.inference.orchestrator")
def test_completion_fallback_logic(mock_orchestrator, db_session, test_api_key):
    """Test LLM fallback logic"""
    # Make primary provider fail
    mock_orchestrator.generate.side_effect = [
        Exception("Primary failed"),  # First attempt fails
        {"text": "Fallback response", "provider": "external", "tokens_used": 10, "latency_ms": 100}  # Fallback succeeds
    ]
    
    response = client.post(
        f"{settings.API_V1_PREFIX}/completions",
        headers={"X-API-Key": "test_key_123"},
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "external"  # Verify fallback was used
    assert data["text"] == "Fallback response"

def test_completion_invalid_request(db_session, test_api_key):
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