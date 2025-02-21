from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "PeerAI"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    MOCK_MODE: bool = False
    
    # Database URLs - Required to be in Sweden (Bahnhof)
    # url: postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = "postgresql://localhost/peerai"
    
    # LLM Configuration
    # url: https://llm-api.bahnhof.se/v1/completions
    HOSTED_LLM_URL: str = ""  
    # url: https://fallback-llm.se/v1/completions
    EXTERNAL_LLM_URL: str = ""  
    HOSTED_LLM_API_KEY: str = ""
    EXTERNAL_LLM_API_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "development_key"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields from environment variables

settings = Settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Import and include routers
from api.routes import inference
app.include_router(inference.router, prefix=settings.API_V1_PREFIX)

# TODO: Admin router is under development and will be enabled in a future PR
# Features planned:
# - User management
# - Usage analytics
# - System configuration
# from api.routes import admin
# app.include_router(admin.router, prefix=settings.API_V1_PREFIX) 