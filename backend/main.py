from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from backend.config import settings
from backend.core.security import get_current_user
from backend.core.roles import Permission, has_permission
from backend.models.auth import User

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    # Disable default OpenAPI docs
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
)

# Create a sub-application for LLM API endpoints with its own CORS settings
llm_app = FastAPI(
    title="PeerAI LLM API",
    version=settings.VERSION,
)

# CORS for LLM API endpoints - allow all origins
llm_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the LLM API
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],  # Only allow specific methods
    allow_headers=[
        "Content-Type",
        "X-API-Key",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],  # Expose all response headers
    max_age=3600,  # Cache preflight response for 1 hour
)

# CORS for main app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the main app
    allow_credentials=False, # Must be False when using "*"
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
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Import routers
from backend.routes import inference, auth, admin, rbac, referral, admin_models

# Mount all routers with API prefix for direct access
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(rbac.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_models.router, prefix=settings.API_V1_PREFIX + "/admin") # /api/admin/...
app.include_router(referral.router, prefix=settings.API_V1_PREFIX)

# Import LLM routes and mount them on a specific prefix
llm_app.include_router(inference.router)
# Mount LLM app with API prefix
app.mount(f"{settings.API_V1_PREFIX}/llm", llm_app)

@app.get("/")
async def root():
    return {"message": "Welcome to Peer AI API"}
