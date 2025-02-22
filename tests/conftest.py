"""Test configuration and fixtures."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
import os
import logging
from datetime import datetime, timedelta
from jose import jwt
from typing import List, AsyncGenerator
import httpx
import pytest_asyncio
from httpx import AsyncClient
from starlette.websockets import WebSocket

from backend.main import app
from backend.database import get_db
from backend.models.base import Base
from backend.config import settings
from backend.models.auth import User, APIKey, DBSystemSettings
from backend.core.security import get_password_hash
from backend.models.usage import UsageRecord

# Ensure we're in test environment
os.environ["ENVIRONMENT"] = "test"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create test database engine with better isolation
test_engine = create_engine(
    settings.TEST_DATABASE_URL, poolclass=StaticPool, isolation_level="SERIALIZABLE"
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def create_test_token(user_id: int, is_superuser: bool = False) -> str:
    """Create a test JWT token."""
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode = {"sub": str(user_id), "exp": expire, "is_superuser": is_superuser}
    token = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token


@pytest.fixture
def admin_token(admin_user) -> str:
    """Create a token for admin user."""
    return create_test_token(admin_user.id, is_superuser=True)


@pytest.fixture
def user_token(test_user) -> str:
    """Create a token for regular user."""
    return create_test_token(test_user.id)


@pytest.fixture
def admin_user(db_session) -> User:
    """Create an admin user."""
    user = User(
        email="admin@peerai.se",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user."""
    user = User(
        email="test@peerai.se",
        hashed_password=get_password_hash("test123"),
        full_name="Test User",
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_api_key(db_session, test_user) -> APIKey:
    """Create a test API key."""
    api_key = APIKey(
        key="test_key_123",
        name="Test Key",
        user_id=test_user.id,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30),
        daily_limit=1000,
        minute_limit=60,
    )
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)
    return api_key


@pytest.fixture
def test_settings(db_session) -> DBSystemSettings:
    """Create test system settings."""
    settings = DBSystemSettings(
        rate_limit={"enabled": True, "requestsPerMinute": 60, "tokensPerDay": 1000},
        security={
            "maxTokenLength": 4096,
            "allowedOrigins": ["https://app.peerdigital.se"],
        },
        models={
            "defaultModel": "claude-3-sonnet-20240229",
            "maxContextLength": 200000,
            "temperature": 0.7,
        },
        monitoring={"logLevel": "info", "retentionDays": 30, "alertThreshold": 5},
        beta_features={"visionEnabled": True, "audioEnabled": True},
    )
    db_session.add(settings)
    db_session.commit()
    db_session.refresh(settings)
    return settings


@pytest.fixture
def test_usage_records(db_session, test_user, test_api_key) -> List[UsageRecord]:
    """Create test usage records."""
    records = []
    for i in range(10):
        record = UsageRecord(
            user_id=test_user.id,
            api_key_id=test_api_key.id,
            timestamp=datetime.utcnow() - timedelta(days=i),
            model="claude-3-sonnet-20240229",  # @note: Model name - do not change
            endpoint="/completions",
            tokens_used=100 * (i + 1),
            latency_ms=200.0,
            error=i % 3 == 0,  # Every third request is an error
            error_type="rate_limit_exceeded" if i % 3 == 0 else None,
            error_message="Rate limit exceeded" if i % 3 == 0 else None,
            status_code=429 if i % 3 == 0 else 200,
        )
        records.append(record)

    db_session.bulk_save_objects(records)
    db_session.commit()
    return records


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create test database tables."""
    try:
        # Drop all tables
        Base.metadata.drop_all(bind=test_engine)
        logger.info("Dropped all existing tables")

        # Run Alembic migrations to ensure schema is up to date
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Applied all migrations successfully")

        yield

        # Drop all tables after tests
        Base.metadata.drop_all(bind=test_engine)
        logger.info("Cleaned up test database")

    except Exception as e:
        logger.error(f"Error setting up test database: {str(e)}")
        raise


@pytest.fixture
def session() -> Session:
    """Create a new database session for a test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def test_db(session: Session):
    """Test database fixture."""
    return session


@pytest.fixture
def db_session():
    """Create mock database session"""
    from unittest.mock import MagicMock, PropertyMock

    session = MagicMock()

    # Create a mock query builder
    query = MagicMock()
    query.filter = MagicMock(return_value=query)
    query.first = MagicMock(return_value=None)
    query.all = MagicMock(return_value=[])
    query.count = MagicMock(return_value=0)

    # Make session.query return the mock query builder
    type(session).query = PropertyMock(return_value=query)

    return session


@pytest.fixture
def client(db_session):
    """Get a test client with database session."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client():
    """Create async test client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def test_client():
    """Create test client"""
    from starlette.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    yield client


@pytest_asyncio.fixture
async def async_client(db_session) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Get an async test client with database session."""

    async def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(
        app=app
    )  # @note: ASGI transport for testing FastAPI
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as test_client:
        # Add WebSocket support
        test_client.websocket_connect = lambda url, **kwargs: WebSocket(
            scope={
                "type": "websocket",
                "path": url,
                "query_string": b"",
                "headers": [],
                "client": ("127.0.0.1", 8000),
                "server": ("127.0.0.1", 80),
            }
        )
        yield test_client
    app.dependency_overrides.clear()


class MockWebSocket:
    def __init__(self, scope, receive, send):
        self.scope = scope
        self.receive = receive
        self.send = send
        self.accepted = False
        self.closed = False
        self.messages = []

    async def accept(self):
        self.accepted = True

    async def close(self, code=1000, reason=None):
        self.closed = True

    async def send_json(self, data):
        self.messages.append(data)

    async def receive_json(self):
        return {"prompt": "Test streaming", "mock_mode": True, "close": True}


@pytest.fixture
def websocket():
    """Create mock websocket"""

    async def mock_receive():
        return {"type": "websocket.receive"}

    async def mock_send(message):
        pass

    scope = {
        "type": "websocket",
        "path": "/api/v1/stream",
        "query_string": b"api_key=test_key_123",
        "headers": [],
        "client": ("127.0.0.1", 8000),
        "server": ("127.0.0.1", 80),
    }

    return MockWebSocket(scope, mock_receive, mock_send)
