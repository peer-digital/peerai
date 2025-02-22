"""Analytics service for collecting and processing usage data."""

from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session

from models.auth import User, APIKey
from models.usage import UsageRecord


async def get_analytics_data(
    db: Session,
    timeframe: str = "7d",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict:
    """Get analytics data for the specified timeframe."""
    if not start_date:
        if timeframe == "24h":
            start_date = datetime.utcnow() - timedelta(days=1)
        elif timeframe == "7d":
            start_date = datetime.utcnow() - timedelta(days=7)
        elif timeframe == "30d":
            start_date = datetime.utcnow() - timedelta(days=30)
        else:
            start_date = datetime.utcnow() - timedelta(days=7)  # Default to 7 days

    if not end_date:
        end_date = datetime.utcnow()

    # Get usage records for the period
    records = (
        db.query(UsageRecord)
        .filter(UsageRecord.timestamp >= start_date, UsageRecord.timestamp <= end_date)
        .all()
    )

    # Calculate metrics
    total_requests = len(records)
    total_tokens = sum(r.tokens_used for r in records)
    average_latency = (
        sum(r.latency_ms for r in records) / total_requests if total_requests > 0 else 0
    )
    error_count = sum(1 for r in records if r.error)
    error_rate = error_count / total_requests if total_requests > 0 else 0

    # Get model usage
    model_usage = {}
    for record in records:
        model = record.model
        model_usage[model] = model_usage.get(model, 0) + 1

    # Get endpoint usage
    endpoint_usage = {}
    for record in records:
        endpoint = record.endpoint
        endpoint_usage[endpoint] = endpoint_usage.get(endpoint, 0) + 1

    # Get error types
    error_types = {}
    for record in records:
        if record.error:
            error_type = record.error_type or "unknown"
            error_types[error_type] = error_types.get(error_type, 0) + 1

    return {
        "usage": {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "average_latency": average_latency,
            "error_rate": error_rate,
        },
        "models": model_usage,
        "endpoints": endpoint_usage,
        "errors": error_types,
    }


async def get_user_stats(db: Session) -> Dict:
    """Get user statistics."""
    total_users = db.query(User).count()

    # Active users in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_users = (
        db.query(UsageRecord.user_id)
        .distinct()
        .filter(UsageRecord.timestamp >= seven_days_ago)
        .count()
    )

    # New users in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users = db.query(User).filter(User.created_at >= thirty_days_ago).count()

    # User types (based on API key limits)
    free_users = db.query(APIKey).filter(APIKey.daily_limit <= 1000).count()
    pro_users = (
        db.query(APIKey)
        .filter(APIKey.daily_limit > 1000, APIKey.daily_limit <= 10000)
        .count()
    )
    enterprise_users = db.query(APIKey).filter(APIKey.daily_limit > 10000).count()

    return {
        "total_users": total_users,
        "active_users_7d": active_users,
        "new_users_30d": new_users,
        "user_types": {
            "free": free_users,
            "pro": pro_users,
            "enterprise": enterprise_users,
        },
    }


async def export_analytics_data(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    format: str = "json",
) -> Dict:
    """Export analytics data in the specified format."""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    records = (
        db.query(UsageRecord)
        .filter(UsageRecord.timestamp >= start_date, UsageRecord.timestamp <= end_date)
        .order_by(UsageRecord.timestamp)
        .all()
    )

    data = []
    for record in records:
        data.append(
            {
                "timestamp": record.timestamp.isoformat(),
                "user_id": record.user_id,
                "model": record.model,
                "endpoint": record.endpoint,
                "tokens": record.tokens_used,
                "latency": record.latency_ms,
                "error": record.error,
                "error_type": record.error_type,
            }
        )

    return {"data": data, "format": format}
