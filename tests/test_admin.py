import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import timedelta

from backend.main import app
from backend.database import get_db
from backend.models.auth import User
from backend.core.security import get_password_hash
from backend.models.auth import DBSystemSettings

# Test client setup
client = TestClient(app)


@pytest.fixture
def admin_user():
    """Create a test admin user"""
    return User(
        id=1,
        email="admin@peerai.se",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )


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
def auth_token(admin_user, db_session):
    """Create a valid JWT token for admin user"""
    from backend.routes.auth import create_access_token
    from backend.config import settings

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin_user.email}, expires_delta=access_token_expires
    )
    return access_token


@pytest.mark.asyncio
async def test_get_system_settings(db_session, admin_user, auth_token, async_client):
    """Test retrieving system settings"""
    # Mock authentication and settings
    mock_settings = DBSystemSettings(
        rate_limit={"enabled": True, "requestsPerMinute": 100, "tokensPerDay": 10000},
        security={"maxTokenLength": 4096, "allowedOrigins": ["https://app.peerai.se"]},
        models={
            "defaultModel": "claude-3-sonnet-20240229",  # @note: Model name - do not change
            "maxContextLength": 200000,
            "temperature": 0.7,
        },
        monitoring={"logLevel": "info", "retentionDays": 30, "alertThreshold": 5},
        beta_features={"visionEnabled": True, "audioEnabled": True},
    )

    db_session.query.return_value.filter.return_value.first.side_effect = [
        admin_user,
        mock_settings,
    ]

    response = await async_client.get(
        "/api/v1/admin/settings", headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rateLimit"]["enabled"] is True
    assert data["rateLimit"]["requestsPerMinute"] == 100
    assert data["security"]["maxTokenLength"] == 4096
    assert data["models"]["defaultModel"] == "claude-3-sonnet-20240229"
    assert data["monitoring"]["logLevel"] == "info"
    assert data["betaFeatures"]["visionEnabled"] is True


def test_update_system_settings(db_session, admin_user, auth_token):
    """Test updating system settings"""
    # Mock authentication and existing settings
    db_session.query.return_value.filter.return_value.first.side_effect = [
        admin_user,
        None,
    ]

    new_settings = {
        "rateLimit": {"enabled": True, "requestsPerMinute": 100, "tokensPerDay": 10000},
        "security": {
            "maxTokenLength": 4096,
            "allowedOrigins": ["https://app.peerai.se"],
        },
        "models": {
            "defaultModel": "claude-3-sonnet-20240229",  # @note: Model name - do not change
            "maxContextLength": 200000,
            "temperature": 0.7,
        },
        "monitoring": {"logLevel": "info", "retentionDays": 30, "alertThreshold": 5},
        "betaFeatures": {"visionEnabled": True, "audioEnabled": True},
    }

    response = client.put(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=new_settings,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Settings updated successfully"


def test_get_system_settings_unauthorized(db_session):
    """Test unauthorized access to system settings"""
    # Test without token
    response = client.get("/api/v1/admin/settings")
    assert response.status_code == 401

    # Test with non-admin user
    regular_user = User(
        id=2,
        email="user@peerai.se",
        hashed_password=get_password_hash("user123"),
        full_name="Regular User",
        is_active=True,
        is_superuser=False,
    )

    # Create token for regular user
    from backend.routes.auth import create_access_token
    from datetime import timedelta
    from backend.config import settings

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    regular_token = create_access_token(
        data={"sub": regular_user.email}, expires_delta=access_token_expires
    )

    db_session.query.return_value.filter.return_value.first.return_value = regular_user

    response = client.get(
        "/api/v1/admin/settings", headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert response.status_code == 403


def test_update_system_settings_validation(db_session, admin_user, auth_token):
    """Test system settings validation"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    # Test with invalid rate limit values
    invalid_settings = {
        "rateLimit": {
            "enabled": True,
            "requestsPerMinute": -1,  # Invalid negative value
            "tokensPerDay": 10000,
        }
    }

    response = client.put(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=invalid_settings,
    )
    assert response.status_code == 422

    # Test with invalid model settings
    invalid_settings = {"models": {"temperature": 2.0}}  # Invalid temperature > 1.0

    response = client.put(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=invalid_settings,
    )
    assert response.status_code == 422


def test_partial_settings_update(db_session, admin_user, auth_token):
    """Test partial update of system settings"""
    db_session.query.return_value.filter.return_value.first.side_effect = [
        admin_user,
        None,
    ]

    # Update only rate limit settings
    partial_settings = {"rateLimit": {"enabled": False, "requestsPerMinute": 50}}

    response = client.patch(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=partial_settings,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Settings updated successfully"


@pytest.mark.asyncio
async def test_get_analytics(db_session, admin_user, auth_token, async_client):
    """Test retrieving analytics data"""
    # Mock authentication
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    # Mock analytics data
    mock_analytics = {
        "usage": {
            "total_requests": 1000,
            "total_tokens": 50000,
            "average_latency": 250,
            "error_rate": 0.02,
        },
        "models": {
            "claude-3-sonnet-20240229": 600,  # @note: Model name - do not change
            "mistral": 400,
        },
        "endpoints": {"/completions": 800, "/vision": 150, "/audio": 50},
        "errors": {"rate_limit_exceeded": 15, "invalid_input": 5},
    }

    with patch(
        "backend.services.analytics.get_analytics_data", new_callable=AsyncMock
    ) as mock_get:
        mock_get.return_value = mock_analytics
        response = await async_client.get(
            "/api/v1/admin/analytics", headers={"Authorization": f"Bearer {auth_token}"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["usage"]["total_requests"] == 1000
    assert data["models"]["claude-3-sonnet-20240229"] == 600
    assert data["endpoints"]["/completions"] == 800
    assert data["errors"]["rate_limit_exceeded"] == 15


@pytest.mark.asyncio
async def test_get_user_stats(db_session, admin_user, auth_token, async_client):
    """Test retrieving user statistics"""
    # Mock authentication
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    # Mock user stats
    mock_stats = {
        "total_users": 100,
        "active_users_7d": 75,
        "new_users_30d": 25,
        "user_types": {"free": 60, "pro": 30, "enterprise": 10},
    }

    with patch(
        "backend.services.analytics.get_user_stats", new_callable=AsyncMock
    ) as mock_get:
        mock_get.return_value = mock_stats
        response = await async_client.get(
            "/api/v1/admin/users/stats",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["total_users"] == 100
    assert data["active_users_7d"] == 75
    assert data["new_users_30d"] == 25
    assert data["user_types"]["free"] == 60


def test_unauthorized_access(db_session):
    """Test unauthorized access to admin endpoints"""
    # Test without token
    response = client.get("/api/v1/admin/settings")
    assert response.status_code == 401

    # Test with non-admin user
    regular_user = User(
        id=2,
        email="user@peerai.se",
        hashed_password=get_password_hash("user123"),
        full_name="Regular User",
        is_active=True,
        is_superuser=False,
    )

    # Create token for regular user
    from backend.routes.auth import create_access_token
    from datetime import timedelta
    from backend.config import settings

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    regular_token = create_access_token(
        data={"sub": regular_user.email}, expires_delta=access_token_expires
    )

    db_session.query.return_value.filter.return_value.first.return_value = regular_user

    response = client.get(
        "/api/v1/admin/settings", headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_export_analytics_data(db_session, admin_user, auth_token, async_client):
    """Test exporting analytics data"""
    # Mock authentication
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    # Mock export data
    mock_export = {
        "data": [
            {
                "timestamp": "2024-03-15T00:00:00",
                "requests": 100,
                "tokens": 5000,
                "latency": 245,
                "errors": 2,
            },
            {
                "timestamp": "2024-03-16T00:00:00",
                "requests": 120,
                "tokens": 6000,
                "latency": 238,
                "errors": 1,
            },
        ],
        "format": "json",
    }

    with patch(
        "backend.services.analytics.export_analytics_data", new_callable=AsyncMock
    ) as mock_export_fn:
        mock_export_fn.return_value = mock_export
        response = await async_client.get(
            "/api/v1/admin/analytics/export",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2
    assert data["data"][0]["requests"] == 100
    assert data["data"][1]["tokens"] == 6000


@pytest.mark.asyncio
async def test_get_analytics_data(db_session, admin_user, admin_token, async_client):
    """Test getting analytics data"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    mock_data = {
        "usage": {
            "requests": [100, 120],
            "dates": ["2024-03-15", "2024-03-16"],
            "success_rate": [98, 99],
            "avg_latency": [245, 238],
        }
    }

    with patch(
        "backend.services.analytics.get_analytics_data", new_callable=AsyncMock
    ) as mock_analytics:
        mock_analytics.return_value = mock_data
        response = await async_client.get(
            "/api/v1/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "usage" in data
    assert all(
        key in data["usage"]
        for key in ["requests", "dates", "success_rate", "avg_latency"]
    )


@pytest.mark.asyncio
async def test_get_user_stats(db_session, admin_user, admin_token, async_client):
    """Test getting user statistics"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    mock_stats = {"total_users": 100, "active_users": 80, "new_users_last_week": 15}

    with patch(
        "backend.services.analytics.get_user_stats", new_callable=AsyncMock
    ) as mock_stats_fn:
        mock_stats_fn.return_value = mock_stats
        response = await async_client.get(
            "/api/v1/admin/analytics/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert all(
        key in data for key in ["total_users", "active_users", "new_users_last_week"]
    )


@pytest.mark.asyncio
async def test_export_analytics_data(db_session, admin_user, admin_token, async_client):
    """Test exporting analytics data"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    mock_export = {
        "data": [
            {
                "timestamp": "2024-03-15T00:00:00",
                "requests": 100,
                "tokens": 5000,
                "latency": 245,
                "errors": 2,
            }
        ]
    }

    with patch(
        "backend.services.analytics.export_analytics_data", new_callable=AsyncMock
    ) as mock_export_fn:
        mock_export_fn.return_value = mock_export
        response = await async_client.get(
            "/api/v1/admin/analytics/export",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"format": "json"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0


@pytest.mark.asyncio
async def test_get_analytics_by_timeframe(
    db_session, admin_user, admin_token, async_client
):
    """Test retrieving analytics data for different timeframes"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    timeframes = ["24h", "7d", "30d"]

    for timeframe in timeframes:
        mock_data = {
            "usage": {
                "total_requests": 100
                * (1 if timeframe == "24h" else 7 if timeframe == "7d" else 30),
                "total_tokens": 5000
                * (1 if timeframe == "24h" else 7 if timeframe == "7d" else 30),
            }
        }

        with patch(
            "backend.services.analytics.get_analytics_data", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = mock_data
            response = await async_client.get(
                "/api/v1/admin/analytics",
                headers={"Authorization": f"Bearer {admin_token}"},
                params={"period": timeframe},
            )

        assert response.status_code == 200
        data = response.json()
        assert "usage" in data
        assert data["usage"]["total_requests"] > 0


@pytest.mark.asyncio
async def test_export_analytics_data_formats(
    db_session, admin_user, admin_token, async_client
):
    """Test exporting analytics data in different formats"""
    db_session.query.return_value.filter.return_value.first.return_value = admin_user

    mock_export = {
        "data": [
            {
                "timestamp": "2024-03-15T00:00:00",
                "requests": 100,
                "tokens": 5000,
                "latency": 245,
                "errors": 2,
            },
            {
                "timestamp": "2024-03-16T00:00:00",
                "requests": 120,
                "tokens": 6000,
                "latency": 238,
                "errors": 1,
            },
        ]
    }

    # Test JSON format
    with patch(
        "backend.services.analytics.export_analytics_data", new_callable=AsyncMock
    ) as mock_export_fn:
        mock_export_fn.return_value = mock_export
        response = await async_client.get(
            "/api/v1/admin/analytics/export",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={
                "format": "json",
                "start_date": "2024-03-15",
                "end_date": "2024-03-16",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2
    assert data["data"][0]["requests"] == 100


@pytest.mark.asyncio
async def test_analytics_access_control(
    db_session, admin_user, user_token, admin_token, async_client
):
    """Test access control for analytics endpoints"""
    # Test without authentication
    response = await async_client.get("/api/v1/admin/analytics")
    assert response.status_code == 401

    # Test with non-admin user
    regular_user = User(
        id=2,
        email="user@peerai.se",
        hashed_password=get_password_hash("user123"),
        full_name="Regular User",
        is_active=True,
        is_superuser=False,
    )
    db_session.query.return_value.filter.return_value.first.return_value = regular_user

    response = await async_client.get(
        "/api/v1/admin/analytics", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403

    # Test with admin user
    db_session.query.return_value.filter.return_value.first.return_value = admin_user
    response = await async_client.get(
        "/api/v1/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
