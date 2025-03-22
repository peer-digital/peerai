from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, RedirectResponse
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
import os
import pathlib

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

# Define allowed origins based on environment
origins = [
    # @important: Always include localhost origins for development
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    # @important: Include the server's own domain/IP for production
    "http://158.174.210.91",
    settings.ALLOWED_ORIGIN
]

# CORS for main app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    return {"status": "ok", "version": settings.VERSION}

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

# Root endpoint returns a welcome message
@app.get("/")
async def root():
    return {"message": "Welcome to Peer AI API"}

# Check if the frontend build directory exists and serve static files
frontend_path = pathlib.Path(settings.FRONTEND_PATH)
if frontend_path.exists() and frontend_path.is_dir():
    print(f"Mounting frontend from: {frontend_path}")

    # Add a redirect from / to /app/ when accessing the root in a browser
    @app.get("/", response_class=HTMLResponse)
    async def read_root():
        return RedirectResponse(url="/app/")
        
    # Serve static files and assets
    app.mount("/assets", StaticFiles(directory=str(frontend_path / "assets")), name="static")
    
    # Serve manifest.json at root
    @app.get("/manifest.json")
    async def get_manifest():
        manifest_path = frontend_path / "manifest.json"
        return FileResponse(path=str(manifest_path))
    
    # Serve favicon.ico and other root files
    @app.get("/favicon.ico")
    async def get_favicon():
        favicon_path = frontend_path / "assets" / "icons" / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(path=str(favicon_path))
        favicon_alt = frontend_path / "assets" / "icons" / "favicon-32x32.png"
        if favicon_alt.exists():
            return FileResponse(path=str(favicon_alt))
        return JSONResponse(content={"detail": "Favicon not found"}, status_code=404)
    
    # Mount the frontend app at /app
    app.mount("/app", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
