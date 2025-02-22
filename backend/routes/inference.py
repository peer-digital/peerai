"""
Inference routes for PeerAI API
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    WebSocket,
    Query,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import time
import random
import httpx
import logging

from models import APIKey, UsageRecord
from database import get_db
from config import settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


class TextCompletionRequest(BaseModel):
    """Request model for text completion endpoint"""

    prompt: str
    max_tokens: Optional[int] = Field(default=100, ge=1, le=2048)
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    mock_mode: Optional[bool] = False


class VisionRequest(BaseModel):
    """Request model for vision endpoint"""

    image_url: str
    prompt: str
    max_tokens: Optional[int] = Field(default=100, ge=1, le=2048)
    mock_mode: Optional[bool] = False


class AudioRequest(BaseModel):
    """Request model for audio endpoint"""

    audio_url: str
    task: str = Field(description="Task type: 'transcribe' or 'analyze'")
    language: Optional[str] = "en"
    mock_mode: Optional[bool] = False


class CompletionResponse(BaseModel):
    """Response model for completion endpoint"""

    choices: List[dict]  # Matches Mistral's response format
    provider: str
    model: Optional[str] = None  # Added to support model name
    usage: dict  # Matches Mistral's usage format
    latency_ms: int
    additional_data: Optional[dict] = None


# Mock response templates
MOCK_TEXT_RESPONSES = [
    "Based on current research in artificial intelligence, the key concepts include machine learning algorithms, neural networks, and deep learning architectures. These fundamental components work together to enable systems to learn from data and improve their performance over time.",
    "The quantum computing paradigm leverages quantum mechanical phenomena like superposition and entanglement to perform computations. This allows for solving certain problems exponentially faster than classical computers.",
    "Blockchain technology operates as a distributed ledger system, where each block contains a cryptographic hash of the previous block, creating an immutable chain of records. This ensures transparency and security in transactions.",
]

MOCK_VISION_RESPONSES = [
    "The image shows a modern office environment with several workstations. There are multiple monitors displaying code and data visualizations. The lighting is predominantly artificial with some natural light coming through windows on the left.",
    "This appears to be a technical diagram or flowchart. The structure shows interconnected nodes with directional arrows, possibly representing a system architecture or data flow. The color scheme uses blue and gray tones.",
    "The photograph captures a team meeting in progress. Multiple people are gathered around a whiteboard covered in technical drawings and post-it notes. The atmosphere suggests an active brainstorming session.",
]

MOCK_AUDIO_RESPONSES = {
    "transcribe": [
        {
            "text": "In this technical presentation, we'll explore the latest developments in machine learning and their practical applications in industry.",
            "confidence": 0.95,
        },
        {
            "text": "The key challenge in implementing this solution lies in optimizing the neural network architecture for real-time processing.",
            "confidence": 0.92,
        },
    ],
    "analyze": [
        {
            "text": "Speech analysis indicates: Technical presentation, male speaker, professional setting, clear articulation, moderate pace",
            "confidence": 0.88,
        },
        {
            "text": "Audio contains: Multiple speakers, conference room environment, occasional keyboard typing, minimal background noise",
            "confidence": 0.85,
        },
    ],
}


async def get_api_key(
    api_key: str = Header(..., alias="X-API-Key"), db: Session = Depends(get_db)
) -> APIKey:
    """Validate API key and return key object"""
    # For testing, accept the test key
    if api_key == "test_key_123":
        return APIKey(
            id=1,
            key=api_key,
            name="Test Key",
            user_id=1,
            is_active=True,
            daily_limit=1000,
            minute_limit=60,
        )

    # Check database for valid API key
    db_key = (
        db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
    )

    if not db_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check if key has expired
    if db_key.expires_at and db_key.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="API key has expired")

    # Update last used timestamp
    db_key.last_used_at = datetime.utcnow()
    db.commit()

    return db_key


async def check_rate_limits(api_key: APIKey, db: Session):
    """Check if the API key has exceeded its rate limits"""
    # Skip rate limiting for test key
    if api_key.key == "test_key_123":
        return

    # Check daily limit
    today = datetime.utcnow().date()
    daily_usage = (
        db.query(UsageRecord)
        .filter(UsageRecord.api_key_id == api_key.id, UsageRecord.created_at >= today)
        .count()
    )

    if daily_usage >= api_key.daily_limit:
        raise HTTPException(status_code=429, detail="Daily API limit exceeded")

    # Check minute limit
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    minute_usage = (
        db.query(UsageRecord)
        .filter(
            UsageRecord.api_key_id == api_key.id,
            UsageRecord.created_at >= one_minute_ago,
        )
        .count()
    )

    if minute_usage >= api_key.minute_limit:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Please wait a minute."
        )


def create_realistic_mock_response(
    response_type: str, task: Optional[str] = None
) -> CompletionResponse:
    """Generate a realistic mock response based on type"""
    start_time = time.time()

    if response_type == "text":
        response = random.choice(MOCK_TEXT_RESPONSES)
        tokens = len(response.split())
        return CompletionResponse(
            choices=[
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": response},
                    "finish_reason": "stop",
                }
            ],
            provider="mock-gpt4",
            model="mock-gpt4",
            usage={
                "prompt_tokens": tokens,
                "completion_tokens": tokens,
                "total_tokens": tokens * 2,
            },
            latency_ms=int((time.time() - start_time) * 1000),
            additional_data={"confidence": 0.92},
        )

    elif response_type == "vision":
        response = random.choice(MOCK_VISION_RESPONSES)
        tokens = len(response.split())
        return CompletionResponse(
            choices=[
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": response},
                    "finish_reason": "stop",
                }
            ],
            provider="mock-gpt4v",
            model="mock-gpt4v",
            usage={
                "prompt_tokens": tokens,
                "completion_tokens": tokens,
                "total_tokens": tokens * 2,
            },
            latency_ms=int((time.time() - start_time) * 1000),
            additional_data={
                "confidence": 0.89,
                "detected_objects": ["monitor", "desk", "whiteboard"],
            },
        )

    elif response_type == "audio":
        response = random.choice(MOCK_AUDIO_RESPONSES[task])
        tokens = len(response["text"].split())
        return CompletionResponse(
            choices=[
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": response["text"]},
                    "finish_reason": "stop",
                }
            ],
            provider="mock-whisper",
            model="mock-whisper",
            usage={
                "prompt_tokens": tokens,
                "completion_tokens": tokens,
                "total_tokens": tokens * 2,
            },
            latency_ms=int((time.time() - start_time) * 1000),
            additional_data={
                "confidence": response["confidence"],
                "language": "en",
                "speakers": 1,
            },
        )


def record_usage(
    db: Session,
    api_key: APIKey,
    endpoint: str,
    response: CompletionResponse,
    status_code: int,
    error_message: Optional[str] = None,
):
    """Record API usage"""
    if api_key.key == "test_key_123":
        return

    usage = UsageRecord(
        user_id=api_key.user_id,
        api_key_id=api_key.id,
        endpoint=endpoint,
        tokens_used=response.usage.get("total_tokens", 0),
        latency_ms=response.latency_ms,
        status_code=status_code,
        error_message=error_message,
    )
    db.add(usage)
    db.commit()


async def call_hosted_llm(
    client: httpx.AsyncClient, request: TextCompletionRequest
) -> CompletionResponse:
    """Call the hosted LLM service"""
    try:
        response = await client.post(
            settings.HOSTED_LLM_URL,
            headers={"Authorization": f"Bearer {settings.HOSTED_LLM_API_KEY}"},
            json={
                "prompt": request.prompt,
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()

        return CompletionResponse(
            choices=[
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": result["text"]},
                    "finish_reason": "stop",
                }
            ],
            provider="hosted-llm",
            model=result.get("model", "hosted-llm"),
            usage={
                "prompt_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": result.get("usage", {}).get(
                    "completion_tokens", 0
                ),
                "total_tokens": result.get("usage", {}).get("total_tokens", 0),
            },
            latency_ms=int(response.elapsed.total_seconds() * 1000),
            additional_data={"confidence": result.get("confidence")}
            if result.get("confidence")
            else None,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hosted LLM error: {str(e)}")


async def call_mistral(
    client: httpx.AsyncClient, request: TextCompletionRequest
) -> CompletionResponse:
    """Call Mistral's API as fallback"""
    try:
        logger.debug("Calling Mistral API endpoint")

        # Prepare request payload according to Mistral's API format
        payload = {
            "model": settings.EXTERNAL_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": "[REDACTED PROMPT]",
                }  # Don't log actual prompt
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        logger.debug(
            "Prepared Mistral API request with model: %s", settings.EXTERNAL_MODEL
        )

        response = await client.post(
            settings.EXTERNAL_LLM_URL,
            headers={"Authorization": f"Bearer {settings.EXTERNAL_LLM_API_KEY}"},
            json={
                "model": settings.EXTERNAL_MODEL,
                "messages": [{"role": "user", "content": request.prompt}],
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()

        logger.info("Successfully called Mistral API")
        return CompletionResponse(
            choices=result["choices"],
            provider="mistral",
            model=settings.EXTERNAL_MODEL,
            usage=result["usage"],
            latency_ms=int(response.elapsed.total_seconds() * 1000),
        )
    except httpx.HTTPError as e:
        logger.error("HTTP error when calling Mistral API: %s", str(e))
        raise HTTPException(
            status_code=e.response.status_code if hasattr(e, "response") else 502,
            detail=f"Mistral API error: {str(e)}",
        )
    except Exception as e:
        logger.error("Unexpected error when calling Mistral API: %s", str(e))
        raise HTTPException(status_code=502, detail=f"Mistral API error: {str(e)}")


@router.post("/completions", response_model=CompletionResponse)
async def create_completion(
    request: TextCompletionRequest,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """Create a completion for the given prompt"""
    # Record start time for latency tracking
    start_time = time.time()

    # Handle mock mode
    if request.mock_mode or settings.MOCK_MODE:
        response = create_realistic_mock_response("text")
        record_usage(db, api_key, "/completions", response, 200)
        return response

    # Check rate limits
    await check_rate_limits(api_key, db)

    async with httpx.AsyncClient() as client:
        try:
            # Try hosted LLM first if configured
            if settings.HOSTED_LLM_URL and settings.HOSTED_LLM_API_KEY:
                try:
                    response = await call_hosted_llm(client, request)
                    record_usage(db, api_key, "/completions", response, 200)
                    return response
                except HTTPException as e:
                    # Fallback to Mistral on:
                    # - Any 5xx server error
                    # - Connection timeouts
                    # - Connection errors
                    should_fallback = (
                        500 <= e.status_code < 600
                    ) or str(  # Any 5xx error
                        e.detail
                    ).startswith(
                        ("Connection refused", "Connection timed out")
                    )
                    if not should_fallback:
                        raise
                    logger.warning(
                        "Hosted LLM failed, falling back to Mistral: %s", str(e)
                    )

            # Use Mistral as fallback or primary if no hosted LLM
            response = await call_mistral(client, request)
            record_usage(db, api_key, "/completions", response, 200)
            return response

        except Exception as e:
            error_latency = int((time.time() - start_time) * 1000)
            error_response = CompletionResponse(
                choices=[],
                provider="error",
                usage={"total_tokens": 0},
                latency_ms=error_latency,
            )
            record_usage(
                db,
                api_key,
                "/completions",
                error_response,
                getattr(e, "status_code", 500),
                str(e),
            )
            raise


@router.post("/vision", response_model=CompletionResponse)
async def analyze_image(
    request: VisionRequest,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """Analyze an image using vision models (BETA)"""
    # Record start time for latency tracking
    start_time = time.time()

    # Only mock mode is currently supported
    if not (request.mock_mode or settings.MOCK_MODE):
        error_response = CompletionResponse(
            choices=[],
            provider="error",
            usage={"total_tokens": 0},
            latency_ms=int((time.time() - start_time) * 1000),
        )
        record_usage(db, api_key, "/vision", error_response, 501)
        raise HTTPException(
            status_code=501,
            detail="Vision endpoint is currently in BETA. Only mock mode is supported. Set mock_mode=true to test the API interface.",
        )

    response = create_realistic_mock_response("vision")
    record_usage(db, api_key, "/vision", response, 200)
    return response


@router.post("/audio", response_model=CompletionResponse)
async def process_audio(
    request: AudioRequest,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """Process audio for transcription or analysis (BETA)"""
    # Record start time for latency tracking
    start_time = time.time()

    # Only mock mode is currently supported
    if not (request.mock_mode or settings.MOCK_MODE):
        error_response = CompletionResponse(
            choices=[],
            provider="error",
            usage={"total_tokens": 0},
            latency_ms=int((time.time() - start_time) * 1000),
        )
        record_usage(db, api_key, "/audio", error_response, 501)
        raise HTTPException(
            status_code=501,
            detail="Audio endpoint is currently in BETA. Only mock mode is supported. Set mock_mode=true to test the API interface.",
        )

    response = create_realistic_mock_response("audio", request.task)
    record_usage(db, api_key, "/audio", response, 200)
    return response


@router.websocket("/stream")
async def websocket_endpoint(
    websocket: WebSocket,
    api_key: str = Query(..., alias="api_key"),
    db: Session = Depends(get_db),
):
    """WebSocket endpoint for streaming responses"""
    # Validate API key
    db_key = (
        db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
    )

    if not db_key and api_key != "test_key_123":
        await websocket.close(code=4001, reason="Invalid API key")
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            if "mock_mode" in data and data["mock_mode"]:
                response = random.choice(MOCK_TEXT_RESPONSES)
                await websocket.send_json(
                    {
                        "choices": [
                            {
                                "index": 0,
                                "message": {"role": "assistant", "content": response},
                                "finish_reason": "stop",
                            }
                        ],
                        "provider": "mock-gpt4",
                        "model": "mock-gpt4",
                        "usage": {
                            "prompt_tokens": len(data.get("prompt", "").split()),
                            "completion_tokens": len(response.split()),
                            "total_tokens": len(data.get("prompt", "").split())
                            + len(response.split()),
                        },
                        "latency_ms": 0,
                        "additional_data": {"confidence": 0.92},
                    }
                )

                # Close connection if requested
                if data.get("close"):
                    await websocket.close()
                    break
            else:
                # Implement actual streaming logic here
                pass
    except Exception as e:
        await websocket.close(code=1001, reason=str(e))
