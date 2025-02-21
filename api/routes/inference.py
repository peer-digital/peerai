from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import time

from ..models.auth import APIKey, UsageRecord
from ..database import get_db
from ..main import settings
from orchestrator.main import Orchestrator, InferenceRequest, ModelProvider

router = APIRouter()

# Initialize the orchestrator with settings
orchestrator = Orchestrator(
    hosted_url=settings.HOSTED_LLM_URL,
    external_url=settings.EXTERNAL_LLM_URL,
    hosted_api_key=settings.HOSTED_LLM_API_KEY,
    external_api_key=settings.EXTERNAL_LLM_API_KEY,
    mock_mode=settings.DEBUG  # Use DEBUG mode for mocking
)

class CompletionRequest(BaseModel):
    """Request model for text completion"""
    prompt: str = Field(..., description="The prompt to complete")
    max_tokens: int = Field(default=100, le=2048, description="Maximum tokens to generate")
    temperature: float = Field(default=0.7, ge=0, le=1, description="Sampling temperature")
    provider: Optional[ModelProvider] = Field(
        default=ModelProvider.HOSTED,
        description="The LLM provider to use"
    )

async def get_api_key(
    api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> APIKey:
    """Validate API key and return key object"""
    key = db.query(APIKey).filter(APIKey.key == api_key).first()
    if not key or not key.is_valid():
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key

async def check_rate_limits(api_key: APIKey, db: Session):
    """Check if the API key has exceeded its rate limits"""
    now = datetime.utcnow()
    
    # Check minute limit
    minute_ago = now - timedelta(minutes=1)
    minute_count = db.query(UsageRecord).filter(
        UsageRecord.api_key_id == api_key.id,
        UsageRecord.created_at >= minute_ago
    ).count()
    if minute_count >= api_key.minute_limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded (per minute)"
        )
    
    # Check daily limit
    day_ago = now - timedelta(days=1)
    daily_count = db.query(UsageRecord).filter(
        UsageRecord.api_key_id == api_key.id,
        UsageRecord.created_at >= day_ago
    ).count()
    if daily_count >= api_key.daily_limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded (daily)"
        )

@router.post("/completions")
async def create_completion(
    request: CompletionRequest,
    api_request: Request,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db)
):
    """Generate text completion"""
    # Check rate limits
    await check_rate_limits(api_key, db)
    
    # Track request timing
    start_time = time.time()
    
    try:
        # Convert to orchestrator request
        inference_request = InferenceRequest(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            provider=request.provider
        )
        
        # Get completion
        response = await orchestrator.generate(inference_request)
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Record usage
        usage_record = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint=str(api_request.url),
            tokens_used=response.tokens_used,
            latency_ms=latency_ms,
            status_code=200
        )
        db.add(usage_record)
        db.commit()
        
        # Update API key last used timestamp
        api_key.last_used_at = datetime.utcnow()
        db.commit()
        
        return response
        
    except Exception as e:
        # Record error
        latency_ms = int((time.time() - start_time) * 1000)
        usage_record = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint=str(api_request.url),
            latency_ms=latency_ms,
            status_code=500,
            error_message=str(e)
        )
        db.add(usage_record)
        db.commit()
        
        raise HTTPException(
            status_code=500,
            detail="Inference failed"
        ) 