"""
Admin routes for PeerAI API
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc, case
from sqlalchemy.orm import Session
from pydantic import BaseModel

# @important: Using absolute imports from backend package
from backend.database import get_db
from backend.models.auth import User, APIKey, DBSystemSettings
from backend.models.usage import UsageRecord
from backend.models.models import ModelProvider, AIModel, ModelRequestMapping
from backend.core.security import get_current_user
from backend.schemas.admin import SystemSettings, UserResponse, RateLimitSettings, SecuritySettings, ModelSettings, MonitoringSettings, BetaFeatures, UserUpdate
from backend.core.roles import Permission, has_permission
from backend.services.analytics import (
    get_analytics_data,
    get_user_stats,
    export_analytics_data,
)
from backend.models.referral import Referral
from backend.services.referral import ReferralService

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


class SettingsUpdateResponse(BaseModel):
    status: str
    message: str
    rateLimit: RateLimitSettings
    security: SecuritySettings
    models: ModelSettings
    monitoring: MonitoringSettings
    betaFeatures: BetaFeatures


@router.get("/stats", response_model=UsageStats)
async def get_admin_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get total requests and tokens
    usage_stats = db.query(
        func.count(UsageRecord.id).label("total_requests"),
        func.sum(UsageRecord.tokens_used).label("total_tokens"),
        func.avg(UsageRecord.latency_ms).label("avg_latency"),
    ).first()

    # Get active users (users with API requests in the last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = (
        db.query(func.count(func.distinct(UsageRecord.user_id)))
        .filter(UsageRecord.created_at >= thirty_days_ago)
        .scalar()
    )

    # Get daily stats for the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_stats = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.user_id)).label("users"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(UsageRecord.created_at >= seven_days_ago)
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )

    # Calculate change percentages
    prev_period_start = seven_days_ago - timedelta(days=7)
    prev_period_stats = (
        db.query(
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.user_id)).label("users"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= prev_period_start,
            UsageRecord.created_at < seven_days_ago,
        )
        .first()
    )

    # Calculate change percentages
    current_requests = usage_stats.total_requests or 0
    current_tokens = usage_stats.total_tokens or 0
    current_latency = usage_stats.avg_latency or 0
    
    prev_requests = prev_period_stats.requests or 0
    prev_tokens = prev_period_stats.tokens or 0
    prev_users = prev_period_stats.users or 0
    prev_latency = prev_period_stats.latency or 0
    
    requests_change = ((current_requests - prev_requests) / prev_requests * 100) if prev_requests > 0 else 0
    tokens_change = ((current_tokens - prev_tokens) / prev_tokens * 100) if prev_tokens > 0 else 0
    users_change = ((active_users - prev_users) / prev_users * 100) if prev_users > 0 else 0
    latency_change = ((current_latency - prev_latency) / prev_latency * 100) if prev_latency > 0 else 0

    # Get model usage distribution
    model_usage = (
        db.query(
            UsageRecord.model.label("model"),
            func.count(UsageRecord.id).label("requests"),
        )
        .filter(UsageRecord.created_at >= seven_days_ago)
        .group_by(UsageRecord.model)
        .order_by(func.count(UsageRecord.id).desc())
        .limit(5)
        .all()
    )

    # Calculate percentages for model usage
    total_model_requests = sum(m.requests for m in model_usage)
    model_usage_data = [
        {
            "model": m.model,
            "requests": m.requests,
            "percentage": (m.requests / total_model_requests * 100) if total_model_requests > 0 else 0,
        }
        for m in model_usage
    ]

    # Format daily stats
    daily_stats_data = [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "users": stat.users,
            "latency": float(stat.latency or 0),
        }
        for stat in daily_stats
    ]

    return {
        "totalRequests": current_requests,
        "totalTokens": current_tokens,
        "activeUsers": active_users,
        "averageLatency": float(current_latency or 0),
        "requestsChange": float(requests_change),
        "tokensChange": float(tokens_change),
        "usersChange": float(users_change),
        "latencyChange": float(latency_change),
        "dailyStats": daily_stats_data,
        "modelUsage": model_usage_data,
    }


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all users"""
    if not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get all users
    users = db.query(User).order_by(desc(User.created_at)).all()

    # Calculate referral stats for each user
    for user in users:
        # Get the user's referral code
        referral_code = ReferralService.get_referral_code(user.id)
        
        # Find all successful referrals where this user's code was used
        successful_referrals = db.query(Referral).filter(
            Referral.referrer_id == user.id,
            Referral.status == "completed"  # Use string status
        ).all()
        
        # Calculate stats
        total_successful = len(successful_referrals)
        total_tokens = total_successful * ReferralService.REFERRAL_BONUS_TOKENS
        
        user.referral_stats = {
            "total_referrals": total_successful,  # Total equals successful since we only track used codes
            "successful_referrals": total_successful,
            "pending_referrals": 0,  # No pending referrals in the new system
            "total_tokens_earned": total_tokens,
            "referral_code": referral_code
        }

        # Handle last_login (will be None in response if not present)
        if not hasattr(user, 'last_login'):
            setattr(user, 'last_login', None)

    return users


@router.get("/api-keys", response_model=List[APIKeyResponse])
async def get_api_keys(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all API keys with user information"""
    if not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
        raise HTTPException(status_code=403, detail="Not authorized")

    api_keys = (
        db.query(APIKey, User.email.label("user_email"))
        .join(User, APIKey.user_id == User.id)
        .order_by(desc(APIKey.created_at))
        .all()
    )

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
            created_at=key.created_at,
        )
        for key, user_email in api_keys
    ]


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    time_range: str = Query("7d", regex="^(7d|30d|90d)$"),
):
    """Get detailed analytics data"""
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Convert time range to days
    days = int(time_range[:-1])
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get daily analytics
    daily_stats = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.avg(UsageRecord.latency_ms).label("avg_latency"),
            func.sum(case((UsageRecord.status_code < 400, 1), else_=0)).label(
                "successes"
            ),
            func.count(UsageRecord.id).label("total"),
        )
        .filter(UsageRecord.created_at >= start_date)
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )

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
        "avg_latency": avg_latency,
    }


@router.get("/settings", response_model=SystemSettings)
async def get_settings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get system settings"""
    if not has_permission(current_user.role, Permission.VIEW_SETTINGS):
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
        betaFeatures=settings.beta_features,
    )


@router.put("/settings", response_model=SystemSettings)
async def update_settings(
    settings: SystemSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update system settings"""
    if not has_permission(current_user.role, Permission.EDIT_SETTINGS):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get settings from database, create if not exists
    db_settings = db.query(DBSystemSettings).first()
    if not db_settings:
        db_settings = DBSystemSettings()
        db.add(db_settings)

    # Update settings
    db_settings.rate_limit = settings.rateLimit.dict()
    db_settings.security = settings.security.dict()
    db_settings.models = settings.models.dict()
    db_settings.monitoring = settings.monitoring.dict()
    db_settings.beta_features = settings.betaFeatures.dict()
    db_settings.updated_by = current_user.id

    db.commit()
    db.refresh(db_settings)

    return settings


@router.patch("/settings", response_model=SettingsUpdateResponse)
async def partial_update_settings(
    settings: Dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Partially update system settings"""
    if not has_permission(current_user.role, Permission.EDIT_SETTINGS):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get settings from database
    db_settings = db.query(DBSystemSettings).first()
    if not db_settings:
        db_settings = DBSystemSettings()
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)

    # Update only provided settings
    current_settings = SystemSettings(
        rateLimit=db_settings.rate_limit,
        security=db_settings.security,
        models=db_settings.models,
        monitoring=db_settings.monitoring,
        betaFeatures=db_settings.beta_features,
    )

    for key, value in settings.items():
        if hasattr(current_settings, key):
            current_value = getattr(current_settings, key)
            if isinstance(value, dict) and isinstance(current_value, dict):
                # For dictionary values, update only the provided keys
                current_value.update(value)
            else:
                # For non-dictionary values, replace the entire value
                setattr(current_settings, key, value)

    # Save updated settings
    # Convert Pydantic models to dictionaries for database storage
    # But preserve the original structure of the settings
    if isinstance(current_settings.rateLimit, BaseModel):
        db_settings.rate_limit = current_settings.rateLimit.dict()
    else:
        db_settings.rate_limit = current_settings.rateLimit
        
    if isinstance(current_settings.security, BaseModel):
        db_settings.security = current_settings.security.dict()
    else:
        db_settings.security = current_settings.security
        
    if isinstance(current_settings.models, BaseModel):
        db_settings.models = current_settings.models.dict()
    else:
        db_settings.models = current_settings.models
        
    if isinstance(current_settings.monitoring, BaseModel):
        db_settings.monitoring = current_settings.monitoring.dict()
    else:
        db_settings.monitoring = current_settings.monitoring
        
    if isinstance(current_settings.betaFeatures, BaseModel):
        db_settings.beta_features = current_settings.betaFeatures.dict()
    else:
        db_settings.beta_features = current_settings.betaFeatures
        
    db_settings.updated_by = current_user.id

    db.commit()
    db.refresh(db_settings)

    # Return a response with status and message fields
    return {
        "status": "success",
        "message": "Settings updated successfully",
        "rateLimit": current_settings.rateLimit,
        "security": current_settings.security,
        "models": current_settings.models,
        "monitoring": current_settings.monitoring,
        "betaFeatures": current_settings.betaFeatures,
    }


@router.get("/analytics/data")
async def get_analytics_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    timeframe: str = Query("7d", regex="^(24h|7d|30d)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    """Get analytics data"""
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized")

    return get_analytics_data(db, timeframe, start_date, end_date)


@router.get("/analytics/export")
async def export_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    format: str = Query("json", regex="^(json|csv)$"),
):
    """Export analytics data"""
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized")

    return export_analytics_data(db, start_date, end_date, format)


@router.get("/users/stats")
async def get_users_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get user statistics"""
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized")

    return get_user_stats(db)


@router.get("/usage/personal", response_model=UsageStats)
async def get_personal_usage(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get personal usage statistics"""
    # Get total requests and tokens for the current user
    usage_stats = db.query(
        func.count(UsageRecord.id).label("total_requests"),
        func.sum(UsageRecord.tokens_used).label("total_tokens"),
        func.avg(UsageRecord.latency_ms).label("avg_latency"),
    ).filter(UsageRecord.user_id == current_user.id).first()

    # Get daily stats for the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_stats = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.api_key_id)).label("users"),  # Using API keys instead of sessions
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= seven_days_ago,
            UsageRecord.user_id == current_user.id
        )
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )

    # Calculate change percentages
    prev_period_start = seven_days_ago - timedelta(days=7)
    prev_period_stats = (
        db.query(
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.api_key_id)).label("users"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= prev_period_start,
            UsageRecord.created_at < seven_days_ago,
            UsageRecord.user_id == current_user.id
        )
        .first()
    )

    # Calculate change percentages
    current_requests = usage_stats.total_requests or 0
    current_tokens = usage_stats.total_tokens or 0
    current_latency = usage_stats.avg_latency or 0
    current_api_keys = db.query(func.count(func.distinct(UsageRecord.api_key_id))).filter(
        UsageRecord.created_at >= seven_days_ago,
        UsageRecord.user_id == current_user.id
    ).scalar() or 0
    
    prev_requests = prev_period_stats.requests or 0
    prev_tokens = prev_period_stats.tokens or 0
    prev_api_keys = prev_period_stats.users or 0
    prev_latency = prev_period_stats.latency or 0
    
    requests_change = ((current_requests - prev_requests) / prev_requests * 100) if prev_requests > 0 else 0
    tokens_change = ((current_tokens - prev_tokens) / prev_tokens * 100) if prev_tokens > 0 else 0
    api_keys_change = ((current_api_keys - prev_api_keys) / prev_api_keys * 100) if prev_api_keys > 0 else 0
    latency_change = ((current_latency - prev_latency) / prev_latency * 100) if prev_latency > 0 else 0

    # Get model usage distribution
    model_usage = (
        db.query(
            UsageRecord.model.label("model"),
            func.count(UsageRecord.id).label("requests"),
        )
        .filter(
            UsageRecord.created_at >= seven_days_ago,
            UsageRecord.user_id == current_user.id
        )
        .group_by(UsageRecord.model)
        .order_by(func.count(UsageRecord.id).desc())
        .limit(5)
        .all()
    )

    # Calculate percentages for model usage
    total_model_requests = sum(m.requests for m in model_usage)
    model_usage_data = [
        {
            "model": m.model,
            "requests": m.requests,
            "percentage": (m.requests / total_model_requests * 100) if total_model_requests > 0 else 0,
        }
        for m in model_usage
    ]

    # Format daily stats
    daily_stats_data = [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "users": stat.users,
            "latency": float(stat.latency or 0),
        }
        for stat in daily_stats
    ]

    return {
        "totalRequests": current_requests,
        "totalTokens": current_tokens,
        "tokenLimit": current_user.token_limit,
        "tokenUsagePercentage": (current_tokens / current_user.token_limit * 100) if current_user.token_limit > 0 else 0,
        "activeUsers": current_api_keys,  # Using API keys instead of sessions
        "averageLatency": float(current_latency or 0),
        "requestsChange": float(requests_change),
        "tokensChange": float(tokens_change),
        "usersChange": float(api_keys_change),
        "latencyChange": float(latency_change),
        "dailyStats": daily_stats_data,
        "modelUsage": model_usage_data,
    }

@router.get("/usage/team", response_model=UsageStats)
async def get_team_usage(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get team usage statistics"""
    if not has_permission(current_user.role, Permission.VIEW_TEAM_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized to view team usage")
    
    # Get users in the same team
    team_users = db.query(User.id).filter(User.team_id == current_user.team_id).all()
    team_user_ids = [user.id for user in team_users]
    
    # Get total requests and tokens for the team
    usage_stats = db.query(
        func.count(UsageRecord.id).label("total_requests"),
        func.sum(UsageRecord.tokens_used).label("total_tokens"),
        func.avg(UsageRecord.latency_ms).label("avg_latency"),
    ).filter(UsageRecord.user_id.in_(team_user_ids)).first()

    # Get active users (users with API requests in the last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = (
        db.query(func.count(func.distinct(UsageRecord.user_id)))
        .filter(
            UsageRecord.created_at >= thirty_days_ago,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .scalar()
    )

    # Get daily stats for the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_stats = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.user_id)).label("users"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= seven_days_ago,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )

    # Calculate change percentages
    prev_period_start = seven_days_ago - timedelta(days=7)
    prev_period_stats = (
        db.query(
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.count(func.distinct(UsageRecord.user_id)).label("users"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= prev_period_start,
            UsageRecord.created_at < seven_days_ago,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .first()
    )

    # Calculate change percentages
    current_requests = usage_stats.total_requests or 0
    current_tokens = usage_stats.total_tokens or 0
    current_latency = usage_stats.avg_latency or 0
    
    prev_requests = prev_period_stats.requests or 0
    prev_tokens = prev_period_stats.tokens or 0
    prev_users = prev_period_stats.users or 0
    prev_latency = prev_period_stats.latency or 0
    
    requests_change = ((current_requests - prev_requests) / prev_requests * 100) if prev_requests > 0 else 0
    tokens_change = ((current_tokens - prev_tokens) / prev_tokens * 100) if prev_tokens > 0 else 0
    users_change = ((active_users - prev_users) / prev_users * 100) if prev_users > 0 else 0
    latency_change = ((current_latency - prev_latency) / prev_latency * 100) if prev_latency > 0 else 0

    # Get model usage distribution
    model_usage = (
        db.query(
            UsageRecord.model.label("model"),
            func.count(UsageRecord.id).label("requests"),
        )
        .filter(
            UsageRecord.created_at >= seven_days_ago,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .group_by(UsageRecord.model)
        .order_by(func.count(UsageRecord.id).desc())
        .limit(5)
        .all()
    )

    # Calculate percentages for model usage
    total_model_requests = sum(m.requests for m in model_usage)
    model_usage_data = [
        {
            "model": m.model,
            "requests": m.requests,
            "percentage": (m.requests / total_model_requests * 100) if total_model_requests > 0 else 0,
        }
        for m in model_usage
    ]

    # Format daily stats
    daily_stats_data = [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "users": stat.users,
            "latency": float(stat.latency or 0),
        }
        for stat in daily_stats
    ]

    return {
        "totalRequests": current_requests,
        "totalTokens": current_tokens,
        "activeUsers": active_users,
        "averageLatency": float(current_latency or 0),
        "requestsChange": float(requests_change),
        "tokensChange": float(tokens_change),
        "usersChange": float(users_change),
        "latencyChange": float(latency_change),
        "dailyStats": daily_stats_data,
        "modelUsage": model_usage_data,
    }

@router.get("/analytics/personal")
async def get_personal_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    timeRange: str = Query("7d", regex="^(7d|30d|90d)$"),
):
    """Get personal analytics data"""
    # Convert time range to days
    days = int(timeRange[:-1])
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get time series data
    time_series = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id == current_user.id
        )
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )
    
    time_series_data = [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "latency": float(stat.latency or 0),
        }
        for stat in time_series
    ]
    
    # Get model distribution
    model_distribution = (
        db.query(
            UsageRecord.model.label("model"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id == current_user.id
        )
        .group_by(UsageRecord.model)
        .order_by(func.count(UsageRecord.id).desc())
        .all()
    )
    
    model_distribution_data = [
        {
            "model": stat.model,
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
        }
        for stat in model_distribution
    ]
    
    # Get top endpoints
    top_endpoints = (
        db.query(
            UsageRecord.endpoint.label("endpoint"),
            func.count(UsageRecord.id).label("requests"),
            func.avg(UsageRecord.latency_ms).label("avg_latency"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id == current_user.id
        )
        .group_by(UsageRecord.endpoint)
        .order_by(func.count(UsageRecord.id).desc())
        .limit(5)
        .all()
    )
    
    top_endpoints_data = [
        {
            "endpoint": stat.endpoint,
            "requests": stat.requests,
            "avgLatency": float(stat.avg_latency or 0),
        }
        for stat in top_endpoints
    ]
    
    return {
        "timeSeriesData": time_series_data,
        "modelDistribution": model_distribution_data,
        "topEndpoints": top_endpoints_data,
    }

@router.get("/analytics/team")
async def get_team_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    timeRange: str = Query("7d", regex="^(7d|30d|90d)$"),
):
    """Get team analytics data"""
    if not has_permission(current_user.role, Permission.VIEW_TEAM_USAGE):
        raise HTTPException(status_code=403, detail="Not authorized to view team analytics")
    
    # Get users in the same team
    team_users = db.query(User.id).filter(User.team_id == current_user.team_id).all()
    team_user_ids = [user.id for user in team_users]
    
    # Convert time range to days
    days = int(timeRange[:-1])
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get time series data
    time_series = (
        db.query(
            func.date(UsageRecord.created_at).label("date"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
            func.avg(UsageRecord.latency_ms).label("latency"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
        .all()
    )
    
    time_series_data = [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "latency": float(stat.latency or 0),
        }
        for stat in time_series
    ]
    
    # Get model distribution
    model_distribution = (
        db.query(
            UsageRecord.model.label("model"),
            func.count(UsageRecord.id).label("requests"),
            func.sum(UsageRecord.tokens_used).label("tokens"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .group_by(UsageRecord.model)
        .order_by(func.count(UsageRecord.id).desc())
        .all()
    )
    
    model_distribution_data = [
        {
            "model": stat.model,
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
        }
        for stat in model_distribution
    ]
    
    # Get top endpoints
    top_endpoints = (
        db.query(
            UsageRecord.endpoint.label("endpoint"),
            func.count(UsageRecord.id).label("requests"),
            func.avg(UsageRecord.latency_ms).label("avg_latency"),
        )
        .filter(
            UsageRecord.created_at >= start_date,
            UsageRecord.user_id.in_(team_user_ids)
        )
        .group_by(UsageRecord.endpoint)
        .order_by(func.count(UsageRecord.id).desc())
        .limit(5)
        .all()
    )
    
    top_endpoints_data = [
        {
            "endpoint": stat.endpoint,
            "requests": stat.requests,
            "avgLatency": float(stat.avg_latency or 0),
        }
        for stat in top_endpoints
    ]
    
    return {
        "timeSeriesData": time_series_data,
        "modelDistribution": model_distribution_data,
        "topEndpoints": top_endpoints_data,
    }

# Model Registry Admin Routes
@router.get("/models", response_model=List[dict])
async def admin_list_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all models in the registry (admin only)"""
    # Check if user is admin
    if not has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    models = (
        db.query(AIModel)
        .join(ModelProvider)
        .all()
    )
    
    return [
        {
            "id": model.id,
            "name": model.name,
            "display_name": model.display_name,
            "provider": {
                "id": model.provider.id,
                "name": model.provider.name,
                "display_name": model.provider.display_name,
            },
            "model_type": model.model_type,
            "capabilities": model.capabilities,
            "context_window": model.context_window,
            "status": model.status,
            "is_default": model.is_default,
            "cost_per_1k_input_tokens": model.cost_per_1k_input_tokens,
            "cost_per_1k_output_tokens": model.cost_per_1k_output_tokens,
            "created_at": model.created_at,
            "updated_at": model.updated_at,
            "config": model.config,
        }
        for model in models
    ]


class ModelCreateRequest(BaseModel):
    """Request model for creating a new model"""
    name: str
    display_name: str
    provider_id: int
    model_type: str
    capabilities: List[str]
    context_window: Optional[int] = None
    status: str = "active"
    is_default: bool = False
    cost_per_1k_input_tokens: float = 0.0
    cost_per_1k_output_tokens: float = 0.0
    config: Optional[Dict[str, Any]] = None


@router.post("/models", response_model=dict)
async def admin_create_model(
    request: ModelCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new model (admin only)"""
    # Check if user is admin
    if not has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if provider exists
    provider = db.query(ModelProvider).filter(ModelProvider.id == request.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check if model name already exists
    existing_model = db.query(AIModel).filter(AIModel.name == request.name).first()
    if existing_model:
        raise HTTPException(status_code=400, detail="Model with this name already exists")
    
    # If this is set as default, unset any other defaults for this model type
    if request.is_default:
        db.query(AIModel).filter(
            AIModel.model_type == request.model_type,
            AIModel.is_default == True
        ).update({"is_default": False})
    
    # Create the model
    model = AIModel(
        name=request.name,
        display_name=request.display_name,
        provider_id=request.provider_id,
        model_type=request.model_type,
        capabilities=request.capabilities,
        context_window=request.context_window,
        status=request.status,
        is_default=request.is_default,
        cost_per_1k_input_tokens=request.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens=request.cost_per_1k_output_tokens,
        config=request.config or {},
    )
    
    db.add(model)
    db.commit()
    db.refresh(model)
    
    return {
        "id": model.id,
        "name": model.name,
        "display_name": model.display_name,
        "provider_id": model.provider_id,
        "model_type": model.model_type,
        "capabilities": model.capabilities,
        "context_window": model.context_window,
        "status": model.status,
        "is_default": model.is_default,
        "cost_per_1k_input_tokens": model.cost_per_1k_input_tokens,
        "cost_per_1k_output_tokens": model.cost_per_1k_output_tokens,
        "created_at": model.created_at,
        "updated_at": model.updated_at,
        "config": model.config,
    }


class ModelUpdateRequest(BaseModel):
    """Request model for updating a model"""
    display_name: Optional[str] = None
    model_type: Optional[str] = None
    capabilities: Optional[List[str]] = None
    context_window: Optional[int] = None
    status: Optional[str] = None
    is_default: Optional[bool] = None
    cost_per_1k_input_tokens: Optional[float] = None
    cost_per_1k_output_tokens: Optional[float] = None
    config: Optional[Dict[str, Any]] = None


@router.put("/models/{model_id}", response_model=dict)
async def admin_update_model(
    model_id: int,
    request: ModelUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a model (admin only)"""
    # Get the model
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Update fields if provided
    if request.display_name is not None:
        model.display_name = request.display_name
    
    if request.model_type is not None:
        model.model_type = request.model_type
    
    if request.capabilities is not None:
        model.capabilities = request.capabilities
    
    if request.context_window is not None:
        model.context_window = request.context_window
    
    if request.status is not None:
        model.status = request.status
    
    if request.is_default is not None and request.is_default != model.is_default:
        if request.is_default:
            # If setting as default, unset any other defaults for this model type
            db.query(AIModel).filter(
                AIModel.model_type == model.model_type,
                AIModel.is_default == True,
                AIModel.id != model.id
            ).update({"is_default": False})
        model.is_default = request.is_default
    
    if request.cost_per_1k_input_tokens is not None:
        model.cost_per_1k_input_tokens = request.cost_per_1k_input_tokens
    
    if request.cost_per_1k_output_tokens is not None:
        model.cost_per_1k_output_tokens = request.cost_per_1k_output_tokens
    
    if request.config is not None:
        model.config = request.config
    
    model.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(model)
    
    return {
        "id": model.id,
        "name": model.name,
        "display_name": model.display_name,
        "provider_id": model.provider_id,
        "model_type": model.model_type,
        "capabilities": model.capabilities,
        "context_window": model.context_window,
        "status": model.status,
        "is_default": model.is_default,
        "cost_per_1k_input_tokens": model.cost_per_1k_input_tokens,
        "cost_per_1k_output_tokens": model.cost_per_1k_output_tokens,
        "created_at": model.created_at,
        "updated_at": model.updated_at,
        "config": model.config,
    }


@router.delete("/models/{model_id}", response_model=dict)
async def admin_delete_model(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a model (admin only)"""
    # Get the model
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if this is a default model
    if model.is_default:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete a default model. Set another model as default first."
        )
    
    # Delete parameter mappings first
    db.query(ModelRequestMapping).filter(ModelRequestMapping.model_id == model_id).delete()
    
    # Delete the model
    db.delete(model)
    db.commit()
    
    return {"message": f"Model {model.name} deleted successfully"}


# Provider Management Routes
@router.get("/providers", response_model=List[dict])
async def admin_list_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all model providers (admin only)"""
    providers = db.query(ModelProvider).all()
    
    return [
        {
            "id": provider.id,
            "name": provider.name,
            "display_name": provider.display_name,
            "api_base_url": provider.api_base_url,
            "api_key_env_var": provider.api_key_env_var,
            "is_active": provider.is_active,
            "created_at": provider.created_at,
            "updated_at": provider.updated_at,
            "config": provider.config,
        }
        for provider in providers
    ]


class ProviderCreateRequest(BaseModel):
    """Request model for creating a new provider"""
    name: str
    display_name: str
    api_base_url: str
    api_key_env_var: str
    is_active: bool = True
    config: Optional[Dict[str, Any]] = None


@router.post("/providers", response_model=dict)
async def admin_create_provider(
    request: ProviderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new model provider (admin only)"""
    # Check if provider name already exists
    existing_provider = db.query(ModelProvider).filter(ModelProvider.name == request.name).first()
    if existing_provider:
        raise HTTPException(status_code=400, detail="Provider with this name already exists")
    
    # Create the provider
    provider = ModelProvider(
        name=request.name,
        display_name=request.display_name,
        api_base_url=request.api_base_url,
        api_key_env_var=request.api_key_env_var,
        is_active=request.is_active,
        config=request.config or {},
    )
    
    db.add(provider)
    db.commit()
    db.refresh(provider)
    
    return {
        "id": provider.id,
        "name": provider.name,
        "display_name": provider.display_name,
        "api_base_url": provider.api_base_url,
        "api_key_env_var": provider.api_key_env_var,
        "is_active": provider.is_active,
        "created_at": provider.created_at,
        "updated_at": provider.updated_at,
        "config": provider.config,
    }


class ProviderUpdateRequest(BaseModel):
    """Request model for updating a provider"""
    display_name: Optional[str] = None
    api_base_url: Optional[str] = None
    api_key_env_var: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


@router.put("/providers/{provider_id}", response_model=dict)
async def admin_update_provider(
    provider_id: int,
    request: ProviderUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a model provider (admin only)"""
    # Get the provider
    provider = db.query(ModelProvider).filter(ModelProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Update fields if provided
    if request.display_name is not None:
        provider.display_name = request.display_name
    
    if request.api_base_url is not None:
        provider.api_base_url = request.api_base_url
    
    if request.api_key_env_var is not None:
        provider.api_key_env_var = request.api_key_env_var
    
    if request.is_active is not None:
        provider.is_active = request.is_active
    
    if request.config is not None:
        provider.config = request.config
    
    provider.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(provider)
    
    return {
        "id": provider.id,
        "name": provider.name,
        "display_name": provider.display_name,
        "api_base_url": provider.api_base_url,
        "api_key_env_var": provider.api_key_env_var,
        "is_active": provider.is_active,
        "created_at": provider.created_at,
        "updated_at": provider.updated_at,
        "config": provider.config,
    }


# Parameter Mapping Routes
@router.get("/models/{model_id}/mappings", response_model=List[dict])
async def admin_list_parameter_mappings(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List parameter mappings for a model (admin only)"""
    # Check if model exists
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    mappings = db.query(ModelRequestMapping).filter(ModelRequestMapping.model_id == model_id).all()
    
    return [
        {
            "id": mapping.id,
            "model_id": mapping.model_id,
            "peer_param": mapping.peer_param,
            "provider_param": mapping.provider_param,
            "transform_function": mapping.transform_function,
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
        }
        for mapping in mappings
    ]


class ParameterMappingCreateRequest(BaseModel):
    """Request model for creating a parameter mapping"""
    peer_param: str
    provider_param: str
    transform_function: Optional[str] = None


@router.post("/models/{model_id}/mappings", response_model=dict)
async def admin_create_parameter_mapping(
    model_id: int,
    request: ParameterMappingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a parameter mapping for a model (admin only)"""
    # Check if model exists
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if mapping already exists
    existing_mapping = (
        db.query(ModelRequestMapping)
        .filter(
            ModelRequestMapping.model_id == model_id,
            ModelRequestMapping.peer_param == request.peer_param
        )
        .first()
    )
    if existing_mapping:
        raise HTTPException(status_code=400, detail=f"Mapping for parameter '{request.peer_param}' already exists")
    
    # Create the mapping
    mapping = ModelRequestMapping(
        model_id=model_id,
        peer_param=request.peer_param,
        provider_param=request.provider_param,
        transform_function=request.transform_function,
    )
    
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    
    return {
        "id": mapping.id,
        "model_id": mapping.model_id,
        "peer_param": mapping.peer_param,
        "provider_param": mapping.provider_param,
        "transform_function": mapping.transform_function,
        "created_at": mapping.created_at,
        "updated_at": mapping.updated_at,
    }


@router.delete("/mappings/{mapping_id}", response_model=dict)
async def admin_delete_parameter_mapping(
    mapping_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a parameter mapping (admin only)"""
    # Get the mapping
    mapping = db.query(ModelRequestMapping).filter(ModelRequestMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Parameter mapping not found")
    
    # Delete the mapping
    db.delete(mapping)
    db.commit()
    
    return {"message": f"Parameter mapping for '{mapping.peer_param}' deleted successfully"}


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a user's information"""
    if not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields if provided
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.token_limit is not None:
        user.token_limit = user_update.token_limit

    db.commit()
    db.refresh(user)
    return user
