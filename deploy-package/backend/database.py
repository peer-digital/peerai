"""
Database connection module
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from backend.config import settings
from backend.models.base import Base

# Set up logging
logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with proper pooling configuration
# @url: https://www.postgresql.org/
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,  # Increased for better concurrency in single server
    max_overflow=20,  # Increased for peak loads
    pool_timeout=30,
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=1800,  # Recycle connections every 30 minutes
    echo=settings.DEBUG,  # Log SQL queries in debug mode
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
        logger.error(f"Database connection error: {e}")
        db.close()
        raise
    finally:
        db.close()


__all__ = ["Base", "engine", "get_db"]
