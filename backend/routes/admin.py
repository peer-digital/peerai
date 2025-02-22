"""
Admin routes for PeerAI API
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc, case
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.auth import User, APIKey, UsageRecord, SystemSettings as DBSystemSettings
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

# Response Models
class DailyStats(BaseModel):
    date: str
    requests: int
    tokens: int

class UsageStats(BaseModel):
    totalRequests: int
    totalTokens: int
    activeUsers: int
    averageLatency: float
    dailyStats: List[DailyStats]

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime

class APIKeyResponse(BaseModel):
    id: int
    name: str
    user_id: int
    user_email: str
    is_active: bool
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    daily_limit: int
    minute_limit: int
    created_at: datetime

class AnalyticsResponse(BaseModel):
    dates: List[str]
    requests: List[int]
    tokens: List[int]
    success_rate: List[float]
    avg_latency: List[float]

class SystemSettings(BaseModel):
    rateLimit: dict = {
        "enabled": True,
        "requestsPerMinute": 60,
        "tokensPerDay": 100000
    }
    security: dict = {
        "requireSSL": True,
        "maxTokenLength": 4096,
        "allowedOrigins": "http://localhost:3000, https://app.peerai.se"
    }
    models: dict = {
        "defaultModel": "claude-3-sonnet-20240229",
        "maxContextLength": 100000,
        "temperature": 0.7
    }
    monitoring: dict = {
        "logLevel": "info",
        "retentionDays": 30,
        "alertThreshold": 5
    }
    betaFeatures: dict = {
        "visionEnabled": False,
        "audioEnabled": False,
        "visionModel": "claude-3-opus-20240229",
        "audioModel": "whisper-1"
    }

@router.get("/stats", response_model=UsageStats)
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get total requests and tokens
    usage_stats = db.query(
        func.count(UsageRecord.id).label("total_requests"),
        func.sum(UsageRecord.tokens_used).label("total_tokens"),
        func.avg(UsageRecord.latency_ms).label("avg_latency")
    ).first()
    
    # Get active users (users with API requests in the last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = db.query(func.count(func.distinct(UsageRecord.user_id))).filter(
        UsageRecord.created_at >= thirty_days_ago
    ).scalar()
    
    # Get daily stats for the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_stats = db.query(
        func.date(UsageRecord.created_at).label("date"),
        func.count(UsageRecord.id).label("requests"),
        func.sum(UsageRecord.tokens_used).label("tokens")
    ).filter(
        UsageRecord.created_at >= seven_days_ago
    ).group_by(
        func.date(UsageRecord.created_at)
    ).order_by(
        func.date(UsageRecord.created_at)
    ).all()
    
    return {
        "totalRequests": usage_stats.total_requests or 0,
        "totalTokens": usage_stats.total_tokens or 0,
        "activeUsers": active_users or 0,
        "averageLatency": float(usage_stats.avg_latency or 0),
        "dailyStats": [
            {
                "date": stat.date.isoformat(),
                "requests": stat.requests,
                "tokens": stat.tokens
            }
            for stat in daily_stats
        ]
    }

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = db.query(User).order_by(desc(User.created_at)).all()
    return users

@router.get("/api-keys", response_model=List[APIKeyResponse])
async def get_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all API keys with user information"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    api_keys = db.query(APIKey, User.email.label("user_email")).join(
        User, APIKey.user_id == User.id
    ).order_by(desc(APIKey.created_at)).all()
    
    return [
        APIKeyResponse(
            id=key.id,
            name=key.name,
            user_id=key.user_id,
            user_email=user_email,
            is_active=key.is_active,
            expires_at=key.expires_at,
            last_used_at=key.last_used_at,
            daily_limit=key.daily_limit,
            minute_limit=key.minute_limit,
            created_at=key.created_at
        )
        for key, user_email in api_keys
    ]

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    time_range: str = Query("7d", regex="^(7d|30d|90d)$")
):
    """Get detailed analytics data"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Convert time range to days
    days = int(time_range[:-1])
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get daily analytics
    daily_stats = db.query(
        func.date(UsageRecord.created_at).label("date"),
        func.count(UsageRecord.id).label("requests"),
        func.sum(UsageRecord.tokens_used).label("tokens"),
        func.avg(UsageRecord.latency_ms).label("avg_latency"),
        func.sum(case((UsageRecord.status_code < 400, 1), else_=0)).label("successes"),
        func.count(UsageRecord.id).label("total")
    ).filter(
        UsageRecord.created_at >= start_date
    ).group_by(
        func.date(UsageRecord.created_at)
    ).order_by(
        func.date(UsageRecord.created_at)
    ).all()
    
    dates = []
    requests = []
    tokens = []
    success_rate = []
    avg_latency = []
    
    for stat in daily_stats:
        dates.append(stat.date.isoformat())
        requests.append(stat.requests)
        tokens.append(stat.tokens or 0)
        success_rate.append(
            (stat.successes / stat.total * 100) if stat.total > 0 else 100
        )
        avg_latency.append(float(stat.avg_latency or 0))
    
    return {
        "dates": dates,
        "requests": requests,
        "tokens": tokens,
        "success_rate": success_rate,
        "avg_latency": avg_latency
    }

@router.get("/settings", response_model=SystemSettings)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system settings"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get settings from database, create if not exists
    settings = db.query(DBSystemSettings).first()
    if not settings:
        settings = DBSystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return SystemSettings(
        rateLimit=settings.rate_limit,
        security=settings.security,
        models=settings.models,
        monitoring=settings.monitoring,
        betaFeatures=settings.beta_features
    )

@router.put("/settings", response_model=SystemSettings)
async def update_settings(
    settings_update: SystemSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update system settings"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get or create settings
    db_settings = db.query(DBSystemSettings).first()
    if not db_settings:
        db_settings = DBSystemSettings()
        db.add(db_settings)
    
    # Update settings
    db_settings.rate_limit = settings_update.rateLimit
    db_settings.security = settings_update.security
    db_settings.models = settings_update.models
    db_settings.monitoring = settings_update.monitoring
    db_settings.beta_features = settings_update.betaFeatures
    db_settings.updated_by = current_user.id
    
    db.commit()
    db.refresh(db_settings)
    
    return settings_update 