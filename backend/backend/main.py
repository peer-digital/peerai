from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime, timedelta
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create FastAPI app
app = FastAPI(title="PeerAI API", version="0.1.0")

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Health check endpoint
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to PeerAI API"}

# API v1 endpoint
@app.get("/api/v1")
def api_v1():
    return {"message": "PeerAI API v1"}

# Authentication endpoints
@app.post("/auth/login")
def login(login_data: LoginRequest):
    # Check for super admin credentials
    if login_data.email == "super.admin@peerai.se" and login_data.password == "superadmin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 1,
                "email": login_data.email,
                "name": "Super Admin",
                "role": "super_admin"
            }
        )
    # Check for admin credentials
    elif login_data.email == "admin@peerai.se" and login_data.password == "admin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 2,
                "email": login_data.email,
                "name": "Team Admin",
                "role": "user_admin"
            }
        )
    # Check for regular user credentials
    elif login_data.email == "user@peerai.se" and login_data.password == "user123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 3,
                "email": login_data.email,
                "name": "Regular User",
                "role": "user"
            }
        )
    # Fallback for demo purposes
    elif login_data.email == "admin@example.com" and login_data.password == "password":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 4,
                "email": login_data.email,
                "name": "Admin User",
                "role": "admin"
            }
        )
    
    # If no credentials match
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.get("/auth/me")
def get_current_user():
    # This is a mock implementation - in production, validate token and return user
    return {
        "id": 1,
        "email": "super.admin@peerai.se",
        "name": "Super Admin",
        "role": "super_admin"
    }

@app.get("/auth/validate")
def validate_token():
    # This is a mock implementation for token validation
    return {
        "id": 1,
        "email": "super.admin@peerai.se",
        "is_active": True,
        "role": "super_admin",
        "full_name": "Super Admin",
        "token_limit": 100000
    }

# Create API v1 router for versioned endpoints
api_v1_router = APIRouter(prefix="/api/v1")

# Add API v1 auth endpoints
@api_v1_router.post("/auth/login")
def api_v1_login(login_data: LoginRequest):
    # Reuse the same login logic
    return login(login_data)

@api_v1_router.get("/auth/me")
def api_v1_get_current_user():
    # Reuse the same get_current_user logic
    return get_current_user()

@api_v1_router.get("/auth/validate")
def api_v1_validate_token():
    # Reuse the same token validation logic
    return validate_token()

# Include the API v1 router
app.include_router(api_v1_router)

# Add non-versioned API endpoints for compatibility
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/login")
def api_login(login_data: LoginRequest):
    # Reuse the same login logic
    return login(login_data)

@api_router.post("/auth/login/json")
def api_login_json(login_data: LoginRequest):
    # Reuse the same login logic for JSON endpoint
    return login(login_data)

@api_router.get("/auth/me")
def api_get_current_user():
    # Reuse the same get_current_user logic
    return get_current_user()

@api_router.get("/auth/validate")
def api_validate_token():
    # Reuse the same token validation logic
    return validate_token()

# Include the non-versioned API router
app.include_router(api_router)

# Form-compatible login endpoint for legacy clients
@app.post("/api/v1/auth/login-form")
async def api_v1_login_form(username: str = Form(...), password: str = Form(...)):
    """Login endpoint that accepts form data for backward compatibility"""
    try:
        # Convert form data to the expected LoginRequest format
        login_data = LoginRequest(email=username, password=password)
        return login(login_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid login payload: {str(e)}"
        ) 