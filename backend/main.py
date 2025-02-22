from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Import and include routers
from routes import inference, auth, admin

app.include_router(inference.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

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
