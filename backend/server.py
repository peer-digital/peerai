"""
Server startup module for the Peer AI application.
This serves as the entry point for the unified server (backend + frontend).
"""
import logging
import os
import sys
import uvicorn
from pathlib import Path

# Ensure backend directory is in the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

logger = logging.getLogger("peerai.server")

# Get the current directory and project root
current_dir = os.path.abspath(os.path.dirname(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
logger.info(f"Current directory: {current_dir}")
logger.info(f"Root directory: {root_dir}")

# Check frontend paths
# First, check the default frontend path from settings
default_frontend_path = Path(os.path.join(root_dir, "frontend/admin-dashboard/dist"))
logger.info(f"Default frontend path: {default_frontend_path}")
logger.info(f"Default frontend path exists: {default_frontend_path.exists()}")

frontend_path = Path(settings.FRONTEND_PATH)
if not frontend_path.exists():
    logger.warning(
        f"Frontend path {frontend_path.absolute()} not found! "
        "Make sure you have built the frontend or set SINGLE_SERVER_MODE=False."
    )
    
    # Try alternative paths
    if default_frontend_path.exists():
        frontend_path = default_frontend_path
        logger.info(f"Found alternative frontend path: {frontend_path}")
        settings.FRONTEND_PATH = str(frontend_path)
    else:
        # Check for built frontend in the project
        alt_paths = [
            Path(os.path.join(root_dir, "frontend", "admin-dashboard", "dist")),
            Path(os.path.join(root_dir, "dist")),
        ]
        
        for path in alt_paths:
            if path.exists() and path.is_dir():
                frontend_path = path
                logger.info(f"Found frontend at: {frontend_path}")
                settings.FRONTEND_PATH = str(frontend_path)
                break

def main():
    """Start the server with Uvicorn"""
    logger.info(f"Starting Peer AI server in {settings.ENVIRONMENT} mode")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Single server mode: {settings.SINGLE_SERVER_MODE}")
    logger.info(f"Frontend path: {settings.FRONTEND_PATH}")
    if "@" in settings.DATABASE_URL:
        db_info = settings.DATABASE_URL.split("@")[1]
    else:
        db_info = "***"
    logger.info(f"Database URL: {db_info}")
    
    # Start the server
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS if not settings.DEBUG else 1,
        log_level="debug" if settings.DEBUG else "info",
    )

if __name__ == "__main__":
    main() 