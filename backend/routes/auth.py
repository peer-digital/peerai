from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
import secrets
import string

# @important: Using absolute imports from backend package
from backend.models.auth import User, APIKey
from backend.database import get_db
from backend.config import settings
from backend.core.security import verify_password, get_password_hash
from backend.services.referral import ReferralService
from backend.services.email import EmailService
from backend.core.roles import Role

router = APIRouter(tags=["authentication"])

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
    role: Optional[Role] = None


class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = None


class DefaultAPIKeyUpdate(BaseModel):
    key_id: int


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    # Use timezone-aware datetime
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=15)
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


def ensure_default_api_key(db: Session, user: User) -> Tuple[bool, Optional[APIKey]]:
    """
    Ensure the user has a default API key.

    This function:
    1. Checks if the user has a valid default API key
    2. If not, checks if user has any API keys and sets the first active one as default
    3. If user has no API keys, creates a default key

    Returns:
    - Tuple of (created_new_key, api_key_object)
    - created_new_key is True if a new key was created, False otherwise
    - api_key_object is the API key object or None if no key was created/found
    """
    created_new_key = False
    api_key = None

    # First, check if the user already has a valid default API key
    if user.default_api_key_id is not None:
        # Verify the default key exists and is active
        default_key = db.query(APIKey).filter(
            APIKey.id == user.default_api_key_id,
            APIKey.user_id == user.id,
            APIKey.is_active == True
        ).first()

        if default_key:
            print(f"User {user.email} already has valid default API key {default_key.id}")
            return False, default_key
        else:
            print(f"User {user.email} has invalid default API key ID {user.default_api_key_id}, will reassign")
            # Clear the invalid default key reference
            user.default_api_key_id = None
            db.commit()

    # Check if user has any active API keys
    active_keys = db.query(APIKey).filter(
        APIKey.user_id == user.id,
        APIKey.is_active == True
    ).all()

    # If user has active keys, set the first one as default
    if active_keys:
        api_key = active_keys[0]
        user.default_api_key_id = api_key.id
        db.commit()
        print(f"Set existing API key {api_key.id} as default for user {user.email}")
        return False, api_key

    # If user has no active keys, create a new default key
    try:
        # Create API key with 1 year expiration
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        api_key = APIKey(
            key=f"pk_{secrets.token_urlsafe(32)}",
            name=f"Default Key",
            user_id=user.id,
            expires_at=expires_at,
            is_active=True
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        # Set as default API key for the user
        user.default_api_key_id = api_key.id
        db.commit()
        print(f"Created new default API key {api_key.id} for user {user.email}")
        created_new_key = True
    except Exception as e:
        print(f"Error creating default API key: {str(e)}")
        db.rollback()
        return False, None

    return created_new_key, api_key


@router.post("/api/v1/auth/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    return await _register_user(user, db)


@router.post("/api/v1/auth/register/{role_path}", response_model=Token)
async def register_user_with_role(
    user: UserCreate,
    role_path: str = Path(..., description="Role path parameter that determines user role"),
    db: Session = Depends(get_db)
):
    """Register a new user with a specific role based on URL path"""
    # Map URL path to role - only exact matches are allowed
    role_mapping = {
        "app_manager": Role.APP_MANAGER,
        # Add more role mappings as needed
    }

    # Set the role based on the path parameter if it's a valid role path
    # Use exact matching to prevent partial matches or unexpected formats
    if role_path in role_mapping:
        user.role = role_mapping[role_path]
        print(f"Setting user role to {user.role} based on registration URL path")
    else:
        # If the role path is not valid, return an error instead of defaulting to USER role
        # This prevents users from registering with invalid role paths
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role path: {role_path}. Valid options are: {', '.join(role_mapping.keys())}"
        )

    return await _register_user(user, db)


async def _register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Internal function to handle user registration logic"""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    hashed_password = get_password_hash(user.password)
    verification_token = generate_verification_token()

    # Create user with specified role if provided, otherwise use default (Role.USER)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.now(timezone.utc),
        role=user.role if user.role else Role.USER
    )

    # Log the role assignment
    print(f"Creating user with role: {db_user.role}")

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create a default API key for the new user
    created, api_key = ensure_default_api_key(db, db_user)
    if not created or not api_key:
        print(f"Warning: Could not create default API key for new user {db_user.email}")
        # Don't fail registration if API key creation fails
    else:
        print(f"Created default API key {api_key.id} for new user {db_user.email}")
        # Refresh the user to ensure we have the latest data
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
                # Create a new referral first and then use it
                ReferralService.create_referral(db, referrer)
                ReferralService.use_referral(db, referrer, db_user)
        except Exception as e:
            print(f"Error processing referral code: {str(e)}")
            # Invalid referral code format, but don't fail registration
            pass

    # Send verification email
    # Always use the backend URL for verification links (it will redirect to frontend)
    import os
    if settings.ENVIRONMENT == "production":
        base_url = os.getenv("VITE_API_BASE_URL", "https://app.peerdigital.se")
    else:
        # Use the backend URL which will handle the redirect
        base_url = "http://localhost:8000"
    # Generate the verification URL that will be sent in the email
    verification_url = f"{base_url}/verify-email/{verification_token}"
    print(f"Generated verification URL: {verification_url}")
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

    # Get the default API key information to return with the token
    default_api_key = None
    if db_user.default_api_key_id:
        default_api_key = db.query(APIKey).filter(
            APIKey.id == db_user.default_api_key_id,
            APIKey.is_active == True
        ).first()

    # If we don't have a valid default key, try to get one
    if not default_api_key:
        print(f"No valid default API key found for user {db_user.email}, trying to find one")
        # Get all active keys for the user
        active_keys = db.query(APIKey).filter(
            APIKey.user_id == db_user.id,
            APIKey.is_active == True
        ).all()

        if active_keys:
            # Use the first active key
            default_api_key = active_keys[0]
            db_user.default_api_key_id = default_api_key.id
            db.commit()
            print(f"Set existing API key {default_api_key.id} as default for user {db_user.email}")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Return token with user data including default API key
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "is_active": db_user.is_active,
            "role": db_user.role,
            "full_name": db_user.full_name,
            "token_limit": db_user.token_limit,
            "default_api_key_id": db_user.default_api_key_id,
            "default_api_key": default_api_key.key if default_api_key else None,
        }
    }


@router.post("/api/v1/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login endpoint that returns a JWT token"""
    print(f"Login attempt for user: {form_data.username}")
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        print(f"User not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        print(f"Invalid password for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print(f"Login successful for user: {user.email}")

    # Ensure user has a default API key
    _, _ = ensure_default_api_key(db, user)
    # We don't need to check the result here as login should proceed regardless

    # Get the default API key information to return with the token
    default_api_key = None
    if user.default_api_key_id:
        default_api_key = db.query(APIKey).filter(
            APIKey.id == user.default_api_key_id,
            APIKey.user_id == user.id,
            APIKey.is_active == True
        ).first()

    # If we don't have a valid default key, try to get one
    if not default_api_key:
        print(f"No valid default API key found for user {user.email}, trying to find one")
        # Get all active keys for the user
        active_keys = db.query(APIKey).filter(
            APIKey.user_id == user.id,
            APIKey.is_active == True
        ).all()

        if active_keys:
            # Use the first active key
            default_api_key = active_keys[0]
            user.default_api_key_id = default_api_key.id
            db.commit()
            print(f"Set existing API key {default_api_key.id} as default for user {user.email}")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    print(f"Generated token: {access_token[:10]}...")

    # Return token with user data including default API key
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "role": user.role,
            "full_name": user.full_name,
            "token_limit": user.token_limit,
            "default_api_key_id": user.default_api_key_id,
            "default_api_key": default_api_key.key if default_api_key else None,
        }
    }


@router.post("/api/v1/auth/api-keys", response_model=dict)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new API key"""
    expires_at = None
    if key_data.expires_in_days:
        # Use timezone-aware datetime
        expires_at = datetime.now(timezone.utc) + timedelta(days=key_data.expires_in_days)

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


@router.get("/api/v1/auth/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """List all API keys for the current user"""
    # Get all API keys for the user
    api_keys = db.query(APIKey).filter(APIKey.user_id == current_user.id).all()

    # Check if the default key ID is valid
    if current_user.default_api_key_id:
        default_key_exists = any(key.id == current_user.default_api_key_id for key in api_keys)
        if not default_key_exists:
            print(f"Default key ID {current_user.default_api_key_id} not found in user's keys. User: {current_user.email}")
            # Find the first active key
            active_keys = [key for key in api_keys if key.is_active]
            if active_keys:
                # Set the first active key as default
                current_user.default_api_key_id = active_keys[0].id
                db.commit()
                print(f"Updated default key ID to {active_keys[0].id} for user {current_user.email}")
            else:
                # No active keys, clear the default key ID
                current_user.default_api_key_id = None
                db.commit()
                print(f"Cleared invalid default key ID for user {current_user.email}")

    return api_keys


@router.get("/api/v1/auth/default-api-key")
async def get_default_api_key(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get the default API key for the current user"""
    # Ensure the default key is valid
    default_api_key = None
    if current_user.default_api_key_id:
        default_api_key = db.query(APIKey).filter(
            APIKey.id == current_user.default_api_key_id,
            APIKey.user_id == current_user.id,
            APIKey.is_active == True
        ).first()

    # If we don't have a valid default key, try to get one
    if not default_api_key:
        print(f"No valid default API key found for user {current_user.email}, trying to find one")
        # Get all active keys for the user
        active_keys = db.query(APIKey).filter(
            APIKey.user_id == current_user.id,
            APIKey.is_active == True
        ).all()

        if active_keys:
            # Use the first active key
            default_api_key = active_keys[0]
            current_user.default_api_key_id = default_api_key.id
            db.commit()
            print(f"Set existing API key {default_api_key.id} as default for user {current_user.email}")

    return {"default_key_id": current_user.default_api_key_id}


@router.post("/api/v1/auth/default-api-key")
async def set_default_api_key(
    data: DefaultAPIKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set the default API key for the current user"""
    print(f"Setting default API key. User ID: {current_user.id}, Key ID: {data.key_id}")

    # Verify the API key belongs to the user
    api_key = db.query(APIKey).filter(
        APIKey.id == data.key_id,
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).first()

    if not api_key:
        print(f"API key not found or not active. Key ID: {data.key_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or not active"
        )

    print(f"Found API key: {api_key.id}, {api_key.name}, User ID: {api_key.user_id}")

    # Update the user's default API key
    current_user.default_api_key_id = api_key.id
    db.commit()
    print(f"Updated default API key for user {current_user.email} to {api_key.id}")

    return {"message": "Default API key updated successfully", "key_id": api_key.id}


@router.delete("/api/v1/auth/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an API key"""
    try:
        # Find the API key
        api_key = (
            db.query(APIKey)
            .filter(APIKey.id == key_id, APIKey.user_id == current_user.id)
            .first()
        )

        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
            )

        # Check if any users have this as their default API key
        users_with_default = db.query(User).filter(User.default_api_key_id == api_key.id).all()

        if users_with_default:
            print(f"Found {len(users_with_default)} users with this API key as default")

            # Update each user to remove the reference
            for user_to_update in users_with_default:
                print(f"Removing default API key reference for user {user_to_update.id}")
                print(f"Current default API key ID: {user_to_update.default_api_key_id}")

                # Update the user
                user_to_update.default_api_key_id = None
                db.add(user_to_update)

            # Commit all user updates in a single transaction
            db.commit()
            print(f"Updated all users' default API key to None. Committing changes.")

            # Refresh the session to ensure we have the latest state
            for user_to_update in users_with_default:
                db.refresh(user_to_update)
                print(f"After update, user {user_to_update.id} default API key ID: {user_to_update.default_api_key_id}")

        # Now delete the API key in a separate transaction
        print(f"Deleting API key with ID: {api_key.id}")
        db.delete(api_key)
        db.commit()
        print(f"API key deleted successfully")

        return {"status": "success"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )


@router.post("/api/v1/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (client should discard token)"""
    # We require current_user to ensure the user is authenticated
    # but we don't actually use it since JWT tokens are stateless
    _ = current_user  # Mark as used to avoid linter warnings
    return {"message": "Successfully logged out"}


@router.get("/api/v1/auth/validate")
async def validate_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate the current user's token and ensure user has a default API key"""

    # Ensure user has a default API key
    _, _ = ensure_default_api_key(db, current_user)

    # Get the default API key information to return with the user data
    default_api_key = None
    if current_user.default_api_key_id:
        default_api_key = db.query(APIKey).filter(
            APIKey.id == current_user.default_api_key_id,
            APIKey.user_id == current_user.id,
            APIKey.is_active == True
        ).first()

    # If we don't have a valid default key, try to get one
    if not default_api_key:
        print(f"No valid default API key found for user {current_user.email}, trying to find one")
        # Get all active keys for the user
        active_keys = db.query(APIKey).filter(
            APIKey.user_id == current_user.id,
            APIKey.is_active == True
        ).all()

        if active_keys:
            # Use the first active key
            default_api_key = active_keys[0]
            current_user.default_api_key_id = default_api_key.id
            db.commit()
            print(f"Set existing API key {default_api_key.id} as default for user {current_user.email}")

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "token_limit": current_user.token_limit,
        "default_api_key_id": current_user.default_api_key_id,
        "default_api_key": default_api_key.key if default_api_key else None,
    }


@router.get("/api/v1/auth/verify-email/{token}")
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
