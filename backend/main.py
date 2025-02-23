from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from config import settings
from core.security import get_current_user
from core.roles import Permission, has_permission
from models.auth import User

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    # Disable default OpenAPI docs
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
)

# @important: CORS configuration for production and development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://peerai-fe.onrender.com",
        "https://peerai-be.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.peerdigital.se",
    ],
    allow_credentials=True,
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
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

@app.get(f"{settings.API_V1_PREFIX}/openapi.json")
async def get_openapi_schema(current_user: User = Depends(get_current_user)):
    """Get OpenAPI schema - protected endpoint requiring VIEW_API_DOCS permission"""
    if not has_permission(current_user.role, Permission.VIEW_API_DOCS):
        raise HTTPException(status_code=403, detail="Not authorized to view API documentation")
    return custom_openapi()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Import and include routers
from routes import inference, auth, admin, rbac

app.include_router(inference.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(rbac.router, prefix=settings.API_V1_PREFIX)

# TODO: Admin router is under development and will be enabled in a future PR
# Features planned:
# - User management
# - Usage analytics
# - System configuration
# from routes import admin
# app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {"message": "Welcome to Peer AI API"}
