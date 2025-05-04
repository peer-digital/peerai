from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
import sys

from backend.config import settings
from backend.core.security import get_current_user, verify_password, create_access_token
from backend.core.roles import Permission, has_permission
from backend.models.auth import User
from backend.database import get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("peerai.log")
    ]
)

logger = logging.getLogger("peerai")

# Only log non-sensitive settings in development mode
if settings.ENVIRONMENT == "development":
    logger.info("Environment: development")

# Define allowed origins for admin/auth endpoints
ADMIN_ALLOWED_ORIGINS = [
    "https://peerai-fe.onrender.com",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://app.peerdigital.se",
    "http://app.peerdigital.se",  # @important: Server domain for production
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    # Disable default OpenAPI docs
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
)

# CORS for main app - allow specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ADMIN_ALLOWED_ORIGINS,  # Use the same origins as admin routes
    allow_credentials=True,  # Allow credentials for all routes
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-API-Key",
    ],
    expose_headers=["*"],
    max_age=3600,
)

# Add a middleware to log requests and handle authentication for debugging
@app.middleware("http")
async def request_logger_middleware(request: Request, call_next):
    # Log only non-sensitive request details
    logger.info(f"Request: {request.method} {request.url.path}")

    # Process the request
    response = await call_next(request)

    # Log the response status
    logger.info(f"Response status: {response.status_code}")

    return response


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description="PeerAI API Documentation",
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "APIKeyHeader": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
        },
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

@app.get(f"{settings.API_V1_PREFIX}/openapi.json")
async def get_openapi_schema(current_user: User = Depends(get_current_user)):
    """Get OpenAPI schema - protected endpoint requiring VIEW_API_DOCS permission"""
    if not has_permission(current_user.role, Permission.VIEW_API_DOCS):
        raise HTTPException(
            status_code=403, detail="Not authorized to view API documentation"
        )
    return custom_openapi()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    # Log exception without sensitive details
    logger.error(f"Global exception handler caught error: {type(exc).__name__}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Import routers
from backend.routes import inference, auth, admin, rbac, referral, admin_models, documents, embeddings

# No need to print API prefix

# Include all routes in the main app with appropriate prefixes
app.include_router(auth.router)          # NO prefix
app.include_router(admin.router)         # NO prefix
app.include_router(rbac.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(admin_models.router, prefix=f"{settings.API_V1_PREFIX}/admin")
app.include_router(referral.router)      # NO prefix
app.include_router(inference.router, prefix=f"{settings.API_V1_PREFIX}/llm") # ADDED LLM router here
app.include_router(embeddings.router, prefix=f"{settings.API_V1_PREFIX}/embeddings") # Embeddings router
app.include_router(documents.router, prefix=f"{settings.API_V1_PREFIX}") # Document management router

# App Store router (deprecated - kept for backward compatibility)
from backend.routes.app_store import router as app_store_router
app.include_router(app_store_router, prefix=f"{settings.API_V1_PREFIX}")

# App Templates router
from backend.routes.app_templates import router as app_templates_router
app.include_router(app_templates_router, prefix=f"{settings.API_V1_PREFIX}")

# Deployed Apps router
from backend.routes.deployed_apps import router as deployed_apps_router
app.include_router(deployed_apps_router, prefix=f"{settings.API_V1_PREFIX}")

# Public Apps router - no authentication required
from backend.routes.public_apps import router as public_apps_router
app.include_router(public_apps_router, prefix=f"{settings.API_V1_PREFIX}")

# No need to print all registered routes

# Create database tables and seed the app store with sample apps
try:
    # Create tables
    from backend.models.base import Base
    from backend.database import engine
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Seed app store (deprecated - kept for backward compatibility)
    from backend.scripts.seed_app_store import seed_app_store
    seed_app_store()
    logger.info("App store seeding completed (deprecated).")

    # Seed app templates
    from backend.scripts.seed_app_templates import seed_app_templates
    seed_app_templates()
    logger.info("App templates seeding completed.")
except Exception as e:
    logger.error(f"Error in database setup: {e}", exc_info=True)

@app.get("/verify-email/{token}")
async def redirect_verify_email(token: str):
    """
    Redirect the verification link to the frontend application.
    This handles direct clicks on email verification links.
    """
    from fastapi.responses import RedirectResponse
    import os

    # Determine the frontend URL based on environment
    if settings.ENVIRONMENT == "production":
        frontend_url = os.getenv("VITE_API_BASE_URL", "https://app.peerdigital.se")
    else:
        # Use the frontend URL (not the backend URL)
        frontend_url = "http://localhost:3000"  # Frontend runs on port 3000 in dev

    # Redirect to the frontend verification page
    return RedirectResponse(url=f"{frontend_url}/verify-email/{token}")

@app.get("/register/{referral_code}")
async def redirect_register(referral_code: str):
    """
    Redirect the referral registration link to the frontend application.
    This handles direct clicks on referral links in emails.
    """
    from fastapi.responses import RedirectResponse
    import os

    # Determine the frontend URL based on environment
    if settings.ENVIRONMENT == "production":
        frontend_url = os.getenv("VITE_API_BASE_URL", "https://app.peerdigital.se")
    else:
        # Use the frontend URL (not the backend URL)
        frontend_url = "http://localhost:3000"  # Frontend runs on port 3000 in dev

    # Redirect to the frontend registration page with referral code
    return RedirectResponse(url=f"{frontend_url}/register/{referral_code}")

@app.get("/")
async def root():
    return {"message": "Welcome to Peer AI API"}
