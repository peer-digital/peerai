import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from api.main import app, settings
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

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_completion_endpoint_success():
    """Test successful completion request with mock mode"""
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
    assert data["text"] == "This is a mock response"
    assert data["provider"] == "mock"
    assert data["tokens_used"] == 10
    assert data["latency_ms"] == 100

def test_completion_invalid_api_key():
    """Test completion with invalid API key"""
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