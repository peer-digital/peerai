"""
Inference routes for PeerAI API
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    WebSocket,
    Query,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import time
import random
import httpx
import logging
from sqlalchemy import func

from models.auth import APIKey, User
from models.usage import UsageRecord
from database import get_db
from config import settings
from services.model_orchestrator import ModelOrchestrator

# Configure logging
logger = logging.getLogger(__name__)

# Force MOCK_MODE to False for testing purposes
settings.MOCK_MODE = False

router = APIRouter()


class TextCompletionRequest(BaseModel):
    """Request model for text completion endpoint"""

    prompt: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    max_tokens: Optional[int] = Field(default=100, ge=1, le=2048)
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    stream: Optional[bool] = Field(
        default=False, 
        description="Not currently implemented. Will be ignored if set to true."
    )
    stop: Optional[Union[str, List[str]]] = None  # Can be a string or list of strings
    random_seed: Optional[int] = None
    safe_prompt: Optional[bool] = Field(default=False)
    presence_penalty: Optional[float] = Field(default=0, ge=-2.0, le=2.0)
    frequency_penalty: Optional[float] = Field(default=0, ge=-2.0, le=2.0)
    mock_mode: Optional[bool] = False
    model: Optional[str] = None  # @model: Model name to use, or None for default

    @validator("prompt", "messages")
    def validate_input(cls, v, values):
        """Validate that either prompt or messages is provided."""
        if (
            "prompt" in values
            and values["prompt"] is None
            and "messages" in values
            and values["messages"] is None
        ):
            raise ValueError("Either 'prompt' or 'messages' must be provided")
        return v


class VisionRequest(BaseModel):
    """Request model for vision endpoint"""

    image_url: str
    prompt: str
    max_tokens: Optional[int] = Field(default=100, ge=1, le=2048)
    mock_mode: Optional[bool] = False


class AudioRequest(BaseModel):
    """Request model for audio endpoint"""

    audio_url: str
    task: str = "transcribe"  # "transcribe" or "analyze"
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
        db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active.is_(True)).first()
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

    # Get the user's token limit
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has exceeded their token limit
    total_tokens = db.query(func.sum(UsageRecord.tokens_used)).filter(
        UsageRecord.user_id == user.id
    ).scalar() or 0

    if total_tokens >= user.token_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Token limit exceeded. Please contact info@peerdigital.se to increase your limit."
        )

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
        model=response.model,
        tokens_used=response.usage.get("total_tokens", 0),
        latency_ms=float(response.latency_ms),
        status_code=status_code,
        error=status_code >= 400,
        error_type="api_error" if status_code >= 400 else None,
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

        # Clean and validate URL
        if not settings.EXTERNAL_LLM_URL:
            raise ValueError("Mistral API URL is not configured")

        # Clean the URL - remove any potential spaces, newlines, or comments
        request_url = settings.EXTERNAL_LLM_URL.split("#")[0].strip()

        if not request_url.startswith("https://"):
            raise ValueError(f"Invalid Mistral API URL format: {request_url}")

        logger.debug("Raw URL from settings: '%s'", settings.EXTERNAL_LLM_URL)
        logger.debug("Cleaned URL for request: '%s'", request_url)

        # Prepare request payload according to Mistral's API format
        payload = {
            "model": settings.EXTERNAL_MODEL,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        
        # Set messages based on either prompt or messages field
        if request.messages:
            payload["messages"] = request.messages
        elif request.prompt:
            payload["messages"] = [{"role": "user", "content": request.prompt}]
            
        # Add optional parameters if they're provided
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        # Remove stream parameter as it's not fully implemented yet
        if "stream" in payload:
            del payload["stream"]
        if request.stop is not None:
            payload["stop"] = request.stop
        if request.random_seed is not None:
            payload["random_seed"] = request.random_seed
        if request.safe_prompt is not None:
            payload["safe_prompt"] = request.safe_prompt
        if request.presence_penalty is not None:
            payload["presence_penalty"] = request.presence_penalty
        if request.frequency_penalty is not None:
            payload["frequency_penalty"] = request.frequency_penalty
        # Override model from request if provided
        if request.model:
            payload["model"] = request.model

        logger.debug("Making request to Mistral API with payload: %s", payload)

        # Make the API call
        response = await client.post(
            request_url,
            headers={"Authorization": f"Bearer {settings.EXTERNAL_LLM_API_KEY}"},
            json=payload,
            timeout=30.0,
        )

        logger.debug("Response status code: %d", response.status_code)
        response.raise_for_status()
        result = response.json()

        logger.info("Successfully called Mistral API")
        return CompletionResponse(
            choices=result["choices"],
            provider="mistral",
            model=settings.EXTERNAL_MODEL if not request.model else request.model,
            usage=result["usage"],
            latency_ms=int(response.elapsed.total_seconds() * 1000),
        )
    except httpx.HTTPError as e:
        logger.error("HTTP error when calling Mistral API: %s", str(e))
        logger.error("Request URL that failed: %s", request_url)
        raise HTTPException(
            status_code=e.response.status_code if hasattr(e, "response") else 502,
            detail=f"Mistral API error: {str(e)}",
        )
    except Exception as e:
        logger.error("Unexpected error when calling Mistral API: %s", str(e))
        raise HTTPException(status_code=502, detail=f"Mistral API error: {str(e)}")


def get_orchestrator(db: Session = Depends(get_db)) -> ModelOrchestrator:
    """Get a model orchestrator instance."""
    orchestrator = ModelOrchestrator(db)
    return orchestrator


@router.post("/completions", response_model=CompletionResponse)
async def create_completion(
    request: TextCompletionRequest,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
    orchestrator: ModelOrchestrator = Depends(get_orchestrator),
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

    try:
        # Prepare request data
        request_data = {}

        # Include either prompt or messages
        if request.prompt:
            request_data["prompt"] = request.prompt
        elif request.messages:
            request_data["messages"] = request.messages

        # Add other parameters
        request_data["max_tokens"] = request.max_tokens
        request_data["temperature"] = request.temperature

        # Call the model through the orchestrator
        response_data = await orchestrator.call_model(
            request_data=request_data,
            model_name=request.model,
            api_key=api_key,
        )

        # Convert to CompletionResponse
        response = CompletionResponse(**response_data)

        # Usage is already recorded by the orchestrator
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


@router.get("/models", response_model=List[Dict[str, Any]])
async def get_available_models(
    model_type: Optional[str] = None,
    db: Session = Depends(get_db),
    orchestrator: ModelOrchestrator = Depends(get_orchestrator),
):
    """Get a list of available models."""
    models = orchestrator.get_available_models(model_type)
    return models


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
        db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active.is_(True)).first()
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
