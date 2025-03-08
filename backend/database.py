"""
Database connection module
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from config import settings
from models.base import Base

# Create SQLAlchemy engine with proper pooling configuration
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,  # Enable connection health checks
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Get database session with proper error handling"""
    db = SessionLocal()
    try:
        # Test the connection using proper SQLAlchemy text()
        db.execute(text("SELECT 1"))
        yield db
    except Exception as e:
        # Log the error and close the session
        print(f"Database connection error: {e}")
        db.close()
        raise
    finally:
        db.close()


__all__ = ["Base", "engine", "get_db"]
