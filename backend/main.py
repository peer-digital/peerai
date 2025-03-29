from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from backend.config import settings
from backend.core.security import get_current_user, verify_password, create_access_token
from backend.core.roles import Permission, has_permission
from backend.models.auth import User
from backend.database import get_db

# Debug: Print all settings
print("\nSettings:")
print(f"API_V1_PREFIX: {settings.API_V1_PREFIX}")
print(f"ENVIRONMENT: {settings.ENVIRONMENT}")
print(f"DEBUG: {settings.DEBUG}")
print(f"PROJECT_NAME: {settings.PROJECT_NAME}")
print(f"VERSION: {settings.VERSION}")

# Define allowed origins for admin/auth endpoints
ADMIN_ALLOWED_ORIGINS = [
    "https://peerai-fe.onrender.com",
    "https://peerai-be.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://app.peerdigital.se",
    "http://158.174.210.91",  # @important: VM IP address for development
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

# CORS for main app - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using "*"
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

# Add a middleware to handle CORS for admin routes specifically
@app.middleware("http")
async def admin_cors_middleware(request: Request, call_next):
    # Logic simplified as we don't need to check for /llm prefix separately anymore
    origin = request.headers.get("Origin")
    response = await call_next(request)
    # Allow credentials ONLY if the origin is in the admin list
    if origin and origin in ADMIN_ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Origin"] = origin
    # If not an allowed admin origin, ensure allow_origin is set (to '*' from main middleware) 
    # and credentials are not allowed (as per main middleware)
    elif "access-control-allow-origin" not in response.headers: 
         response.headers["Access-Control-Allow-Origin"] = "*"
         
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
    # Consider logging the exception details here
    print(f"Global exception handler caught: {exc}") # Basic logging
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Import routers
from backend.routes import inference, auth, admin, rbac, referral, admin_models

# Debug: Print API prefix
print(f"API_V1_PREFIX: {settings.API_V1_PREFIX}")

# Include all routes in the main app with appropriate prefixes
app.include_router(auth.router)          # NO prefix
app.include_router(admin.router)         # NO prefix
app.include_router(rbac.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(admin_models.router, prefix=f"{settings.API_V1_PREFIX}/admin")
app.include_router(referral.router)      # NO prefix
app.include_router(inference.router, prefix=f"{settings.API_V1_PREFIX}/llm") # ADDED LLM router here

# Debug: Print all registered routes AFTER including all routers
print("\nRegistered routes AFTER including all routers:")
for route in app.routes:
    # Filter out internal routes like static files or websocket if any
    if hasattr(route, 'path'):
        print(f"Path: {route.path}, Name: {route.name}, Methods: {getattr(route, 'methods', 'N/A')}")

@app.get("/")
async def root():
    return {"message": "Welcome to Peer AI API"}
