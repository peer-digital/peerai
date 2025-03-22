from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
import secrets
import string

from models.auth import User, APIKey
from database import get_db
from config import settings
from core.security import verify_password, get_password_hash
from services.referral import ReferralService
from services.email import EmailService

router = APIRouter(prefix="/auth", tags=["authentication"])

# Security configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

# @important: JWT configuration from settings
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    referral_code: Optional[str] = None


class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = None


class LoginRequest(BaseModel):
    email: str
    password: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def generate_verification_token() -> str:
    """Generate a random verification token."""
    return secrets.token_urlsafe(32)


@router.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    hashed_password = get_password_hash(user.password)
    verification_token = generate_verification_token()
    
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Handle referral code if provided
    if user.referral_code:
        try:
            # Convert the referral code back to user ID using base36
            code = user.referral_code.lower().lstrip('0')  # Remove leading zeros
            if not code:  # If all zeros, use '0'
                code = '0'
                
            alphabet = string.digits + string.ascii_lowercase
            referrer_id = 0
            for char in code:
                referrer_id = referrer_id * 36 + alphabet.index(char)
            
            referrer = db.query(User).filter(User.id == referrer_id).first()
            if referrer and referrer.id != db_user.id:
                # Create a new referral first
                referral = ReferralService.create_referral(db, referrer)
                # Then use it
                ReferralService.use_referral(db, referrer, db_user)
        except Exception as e:
            print(f"Error processing referral code: {str(e)}")
            # Invalid referral code format, but don't fail registration
            pass

    # Send verification email
    verification_url = f"{settings.FE_URL}/verify-email/{verification_token}"
    try:
        EmailService.send_email(
            to_email=user.email,
            subject="Verify your Peer AI account",
            body=f"""
            Welcome to Peer AI!
            
            Please verify your email address by clicking the link below:
            {verification_url}
            
            If you didn't create an account with us, you can safely ignore this email.
            
            Best regards,
            The Peer AI Team
            """,
            html_body=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to Peer AI!</h2>
                <p>Please verify your email address by clicking the button below:</p>
                
                <div style="text-align: left; margin: 30px 0;">
                    <a href="{verification_url}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Verify Email
                    </a>
                </div>

                <p style="color: #666;">If you didn't create an account with us, you can safely ignore this email.</p>
                <p style="color: #666;">Best regards,<br>The Peer AI Team</p>
            </div>
            """
        )
    except Exception as e:
        print(f"Failed to send verification email: {str(e)}")
        # Don't fail registration if email sending fails

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Login endpoint that returns a JWT token using form data"""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return user info along with the token
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "full_name": user.full_name,
            "token_limit": user.token_limit
        }
    }


@router.post("/login/json")
async def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint that returns a JWT token using JSON data"""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return user info along with the token
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "full_name": user.full_name,
            "token_limit": user.token_limit
        }
    }


@router.post("/api-keys", response_model=dict)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new API key"""
    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)

    api_key = APIKey(
        key=f"pk_{secrets.token_urlsafe(32)}",
        name=key_data.name,
        user_id=current_user.id,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return {"key": api_key.key, "name": api_key.name, "expires_at": api_key.expires_at}


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """List all API keys for the current user"""
    return db.query(APIKey).filter(APIKey.user_id == current_user.id).all()


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an API key"""
    api_key = (
        db.query(APIKey)
        .filter(APIKey.id == key_id, APIKey.user_id == current_user.id)
        .first()
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
        )

    db.delete(api_key)
    db.commit()
    return {"status": "success"}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (client should discard token)"""
    return {"message": "Successfully logged out"}


@router.get("/validate")
async def validate_token(current_user: User = Depends(get_current_user)):
    """Validate the current user's token"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "token_limit": current_user.token_limit,
    }


@router.get("/verify-email/{token}")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user's email address."""
    # First try to find user by token
    user = db.query(User).filter(User.email_verification_token == token).first()
    
    if not user:
        # If token not found, check if any user was verified with this token
        user = db.query(User).filter(
            User.email_verified == True,
            User.email_verification_token == None
        ).order_by(User.email_verification_sent_at.desc()).first()
        
        if user:
            return {
                "message": "Email already verified. You can proceed to login.",
                "status": "already_verified"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
    
    if user.email_verified:
        return {
            "message": "Email already verified. You can proceed to login.",
            "status": "already_verified"
        }
    
    user.email_verified = True
    user.email_verification_token = None  # Clear the token after use
    db.commit()
    
    return {
        "message": "Email verified successfully",
        "status": "verified"
    }
