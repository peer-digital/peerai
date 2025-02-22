"""Test system settings functionality."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timedelta

from backend.main import app
from backend.database import get_db
from backend.models import User, DBSystemSettings
from backend.core.security import get_password_hash
from backend.schemas.admin import SystemSettings

@pytest.fixture
def admin_user():
    """Create a test admin user."""
    return User(
        id=1,
        email="admin@peerdigital.se",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        is_active=True,
        is_superuser=True
    )

@pytest.fixture
def regular_user():
    """Create a test regular user."""
    return User(
        id=2,
        email="user@peerdigital.se",
        hashed_password=get_password_hash("user123"),
        full_name="Regular User",
        is_active=True,
        is_superuser=False
    )

@pytest.fixture
def db_session():
    """Create a mock database session."""
    session = MagicMock()
    
    def get_test_db():
        try:
            yield session
        finally:
            session.close()
    
    app.dependency_overrides[get_db] = get_test_db
    return session

@pytest.fixture
def test_settings():
    """Create test settings"""
    return DBSystemSettings(
        rate_limit={
            "enabled": True,
            "requestsPerMinute": 60,
            "dailyLimit": 1000
        },
        security={
            "allowedOrigins": ["*"],
            "apiKeyExpiration": 30,
            "requireHttps": True
        },
        models={
            "defaultModel": "mistral-tiny",
            "allowedModels": ["mistral-tiny", "mistral-small", "mistral-medium"],
            "fallbackEnabled": True
        },
        monitoring={
            "logLevel": "INFO",
            "errorTracking": True,
            "performanceMonitoring": True
        },
        beta_features={
            "streamingEnabled": False,
            "visionEnabled": False,
            "audioEnabled": False
        }
    )

@pytest.mark.asyncio
async def test_get_settings_admin(db_session, admin_user, admin_token, test_settings, async_client):
    """Test getting settings as admin."""
    # Mock authentication and settings retrieval
    db_session.query.return_value.filter.return_value.first.side_effect = [admin_user, test_settings]

    response = await async_client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rateLimit"]["enabled"] is True
    assert data["models"]["defaultModel"] == "mistral-tiny"

@pytest.mark.asyncio
async def test_get_settings_unauthorized(db_session, regular_user, user_token, async_client):
    """Test getting settings as non-admin user."""
    db_session.query.return_value.filter.return_value.first.return_value = regular_user

    response = await async_client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 403

@pytest.mark.asyncio
async def test_update_settings_admin(db_session, admin_user, admin_token, test_settings, async_client):
    """Test updating settings as admin."""
    db_session.query.return_value.filter.return_value.first.side_effect = [admin_user, test_settings]

    new_settings = {
        "rateLimit": {
            "enabled": False,
            "requestsPerMinute": 30,
            "dailyLimit": 500
        },
        "security": {
            "allowedOrigins": ["*"],
            "apiKeyExpiration": 15,
            "requireHttps": False
        },
        "models": {
            "defaultModel": "mistral-tiny",
            "allowedModels": ["mistral-tiny", "mistral-small", "mistral-medium"],
            "fallbackEnabled": False
        },
        "monitoring": {
            "logLevel": "DEBUG",
            "errorTracking": False,
            "performanceMonitoring": False
        },
        "betaFeatures": {
            "streamingEnabled": True,
            "visionEnabled": True,
            "audioEnabled": True
        }
    }

    response = await async_client.put(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=new_settings
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rateLimit"]["enabled"] is False
    assert data["rateLimit"]["requestsPerMinute"] == 30
    assert data["rateLimit"]["dailyLimit"] == 500
    assert data["security"]["allowedOrigins"] == ["*"]
    assert data["security"]["apiKeyExpiration"] == 15
    assert data["security"]["requireHttps"] is False
    assert data["models"]["defaultModel"] == "mistral-tiny"
    assert data["models"]["allowedModels"] == ["mistral-tiny", "mistral-small", "mistral-medium"]
    assert data["models"]["fallbackEnabled"] is False
    assert data["monitoring"]["logLevel"] == "DEBUG"
    assert data["monitoring"]["errorTracking"] is False
    assert data["monitoring"]["performanceMonitoring"] is False
    assert data["betaFeatures"]["streamingEnabled"] is True
    assert data["betaFeatures"]["visionEnabled"] is True
    assert data["betaFeatures"]["audioEnabled"] is True

@pytest.mark.asyncio
async def test_update_settings_validation(db_session, admin_user, admin_token, async_client):
    """Test settings validation during update."""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    invalid_settings = {
        "rateLimit": {
            "enabled": True,
            "requestsPerMinute": -1,  # Invalid negative value
            "dailyLimit": 1000
        }
    }

    response = await async_client.put(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=invalid_settings
    )

    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_partial_settings_update(db_session, admin_user, admin_token, test_settings, async_client):
    """Test partial settings update."""
    db_session.query.return_value.filter.return_value.first.side_effect = [admin_user, test_settings]

    partial_update = {
        "rateLimit": {
            "enabled": False,
            "requestsPerMinute": 30
        }
    }

    response = await async_client.patch(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=partial_update
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rateLimit"]["enabled"] is False
    assert data["rateLimit"]["requestsPerMinute"] == 30
    # Other settings should remain unchanged
    assert data["models"]["defaultModel"] == "mistral-tiny"
    assert data["models"]["allowedModels"] == ["mistral-tiny", "mistral-small", "mistral-medium"]
    assert data["models"]["fallbackEnabled"] is True
    assert data["monitoring"]["logLevel"] == "INFO"
    assert data["monitoring"]["errorTracking"] is True
    assert data["monitoring"]["performanceMonitoring"] is True
    assert data["betaFeatures"]["streamingEnabled"] is False
    assert data["betaFeatures"]["visionEnabled"] is False
    assert data["betaFeatures"]["audioEnabled"] is False 