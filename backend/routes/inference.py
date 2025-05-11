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
    Response,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import time
import random
import httpx
import logging
import asyncio  # Required for sleep in retry logic
import json
from sqlalchemy import func

from backend.models.auth import APIKey, User, DBSystemSettings
from backend.models.usage import UsageRecord
from backend.models.documents import Document, DocumentChunk, AppDocument
from backend.database import get_db
from backend.config import settings
from backend.services.model_orchestrator import ModelOrchestrator
from backend.services.document_processor import DocumentProcessor
from backend.schemas.rag import RAGCompletionRequest, RAGCompletionResponse, DocumentChunkResponse

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


class TextCompletionRequest(BaseModel):
    """Request model for text completion endpoint"""

    prompt: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    max_tokens: Optional[int] = None  # Will be properly implemented based on model context length
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    stop: Optional[Union[str, List[str]]] = None
    random_seed: Optional[int] = None
    model: Optional[str] = None  # Model name to use, or None for default
    stream: Optional[bool] = Field(default=False)  # Whether to stream the response
    # mock_mode is only available in development environment
    mock_mode: Optional[bool] = Field(default=False, exclude=settings.ENVIRONMENT != "development")

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
    max_tokens: Optional[int] = None  # Will be properly implemented based on model context length
    # mock_mode is only available in development environment
    mock_mode: Optional[bool] = Field(default=False, exclude=settings.ENVIRONMENT != "development")


class AudioRequest(BaseModel):
    """Request model for audio endpoint"""

    audio_url: str
    task: str = "transcribe"  # "transcribe" or "analyze"
    language: Optional[str] = "en"
    # mock_mode is only available in development environment
    mock_mode: Optional[bool] = Field(default=False, exclude=settings.ENVIRONMENT != "development")


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
    client: httpx.AsyncClient, request: TextCompletionRequest, db: Session
) -> CompletionResponse:
    """Call the hosted LLM service"""
    try:
        # Prepare request payload
        payload = {
            "prompt": request.prompt,
            "temperature": request.temperature,
        }

        # Get system settings for max_tokens if not provided
        system_settings = db.query(DBSystemSettings).first()
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        elif system_settings and system_settings.models and "maxTokens" in system_settings.models:
            # Use system settings for max_tokens
            payload["max_tokens"] = system_settings.models["maxTokens"]
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        if request.stop is not None:
            payload["stop"] = request.stop

        response = await client.post(
            settings.HOSTED_LLM_URL,
            headers={"Authorization": f"Bearer {settings.HOSTED_LLM_API_KEY}"},
            json=payload,
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
    client: httpx.AsyncClient, request: TextCompletionRequest, db: Session
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
            "messages": request.messages,
            "temperature": request.temperature,
        }

        # Get system settings for max_tokens if not provided
        system_settings = db.query(DBSystemSettings).first()
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        elif system_settings and system_settings.models and "maxTokens" in system_settings.models:
            # Use system settings for max_tokens
            payload["max_tokens"] = system_settings.models["maxTokens"]
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        if request.stop is not None:
            payload["stop"] = request.stop
        if request.random_seed is not None:
            payload["random_seed"] = request.random_seed

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
            model=settings.EXTERNAL_MODEL,
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

    # Handle streaming response
    if hasattr(request, 'stream') and request.stream:
        return await create_streaming_completion(request, api_key, db, orchestrator)

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
        request_data["temperature"] = request.temperature

        # Get system settings for max_tokens if not provided
        system_settings = db.query(DBSystemSettings).first()
        if request.max_tokens is not None:
            request_data["max_tokens"] = request.max_tokens
        elif system_settings and system_settings.models and "maxTokens" in system_settings.models:
            # Use system settings for max_tokens
            request_data["max_tokens"] = system_settings.models["maxTokens"]

        if request.top_p is not None:
            request_data["top_p"] = request.top_p
        if request.stop is not None:
            request_data["stop"] = request.stop
        if request.random_seed is not None:
            request_data["random_seed"] = request.random_seed

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
            model="error",
            usage={"total_tokens": 0},
            latency_ms=error_latency,
        )
        record_usage(
            db, api_key, "/completions", error_response, 500, str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag", response_model=RAGCompletionResponse)
async def create_rag_completion(
    request: RAGCompletionRequest,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
    orchestrator: ModelOrchestrator = Depends(get_orchestrator),
):
    """Create a RAG-based completion using document context"""
    # Record start time for latency tracking
    start_time = time.time()

    # Handle streaming response separately
    if request.stream:
        return await create_streaming_rag_completion(request, api_key, db, orchestrator)

    # Handle mock mode
    if request.mock_mode or settings.MOCK_MODE:
        mock_sources = [
            DocumentChunkResponse(
                text="This is a sample document chunk that contains relevant information about the query.",
                metadata={
                    "document_id": 1,
                    "document_name": "sample_document.pdf",
                    "chunk_index": 0,
                    "similarity_score": 0.92
                }
            ),
            DocumentChunkResponse(
                text="Another relevant document chunk that provides additional context for the answer.",
                metadata={
                    "document_id": 2,
                    "document_name": "another_document.txt",
                    "chunk_index": 3,
                    "similarity_score": 0.85
                }
            )
        ]

        return RAGCompletionResponse(
            answer="Based on the documents, the answer to your query is that RAG (Retrieval Augmented Generation) combines document retrieval with generative AI to provide more accurate and contextual responses.",
            sources=mock_sources,
            model="mock-rag-model",
            usage={
                "prompt_tokens": 150,
                "completion_tokens": 50,
                "total_tokens": 200
            },
            latency_ms=int((time.time() - start_time) * 1000)
        )

    # Check rate limits
    await check_rate_limits(api_key, db)

    # Check if app exists - support both app_id and app_slug
    app_documents = None
    app_id_to_use = None

    # If app_id is provided, use it directly
    if request.app_id:
        app_id_to_use = request.app_id
        print(f"Using provided app_id: {app_id_to_use}")

    # If app_slug is provided, look up the app by slug
    elif hasattr(request, 'app_slug') and request.app_slug:
        from backend.models.deployed_apps import DeployedApp
        app = db.query(DeployedApp).filter(DeployedApp.slug == request.app_slug).first()
        if app:
            app_id_to_use = app.id
            print(f"Found app_id {app_id_to_use} for slug {request.app_slug}")
            # Store the app_id for future use
            request.app_id = app_id_to_use

    # Try to extract app_id from app_slug if it's in the format "rag-chatbot-123"
    if not app_id_to_use and hasattr(request, 'app_slug') and request.app_slug:
        import re
        match = re.search(r'(\d+)$', request.app_slug)
        if match:
            extracted_id = int(match.group(1))
            print(f"Extracted app_id {extracted_id} from slug {request.app_slug}")

            # Check if this ID exists in the database
            from backend.models.deployed_apps import DeployedApp
            app = db.query(DeployedApp).filter(DeployedApp.id == extracted_id).first()
            if app:
                app_id_to_use = extracted_id
                print(f"Found app with extracted ID {app_id_to_use}")
                # Store the app_id for future use
                request.app_id = app_id_to_use

    # Now get the app documents using the app_id we determined
    if app_id_to_use:
        app_documents = db.query(AppDocument).filter(
            AppDocument.app_id == app_id_to_use,
            AppDocument.is_active.is_(True)
        ).all()
        print(f"Found {len(app_documents)} documents for app_id {app_id_to_use}")

    if not app_documents or len(app_documents) == 0:
        raise HTTPException(
            status_code=404,
            detail="No documents found for this app. Please upload documents first."
        )

    try:
        # Initialize document processor
        doc_processor = DocumentProcessor(db)

        # Get the app ID to use for searching
        # At this point, request.app_id should be set either directly or from the slug lookup
        if not request.app_id:
            raise HTTPException(
                status_code=400,
                detail="Either app_id or app_slug must be provided"
            )

        search_app_id = request.app_id
        print(f"Using app_id {search_app_id} for document search")

        # Search for relevant document chunks
        # Reduced default from 5 to 3 to avoid exceeding token limits
        relevant_chunks = await doc_processor.search_similar_chunks(
            query=request.query,
            app_id=search_app_id,
            top_k=request.top_k or 3,  # Reduced from 5 to 3
            threshold=request.similarity_threshold or 0.7
        )

        # Convert chunks to the format expected by the model
        context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])

        # Prepare messages for the model
        system_prompt = "You are a helpful assistant that answers questions based on the provided document context. When answering, use the information from the documents when available. If the answer is not in the documents, say so clearly and provide a general response based on your knowledge."

        messages = [
            {"role": "system", "content": f"{system_prompt}\n\nDocument Context:\n{context}"},
            {"role": "user", "content": request.query}
        ]

        if request.messages:
            # Add any additional conversation history
            messages.extend(request.messages)

        # Call the model with retry logic for rate limits
        async with httpx.AsyncClient() as client:
            model_name = request.model or settings.EXTERNAL_MODEL

            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": request.temperature or 0.7,
            }

            if request.max_tokens:
                payload["max_tokens"] = request.max_tokens
            if request.top_p:
                payload["top_p"] = request.top_p

            # Retry parameters
            max_retries = 5
            retries = 0
            base_delay = 1  # Start with a 1-second delay

            # Log the total context size
            total_context = "\n".join([msg["content"] for msg in messages])
            context_tokens = len(total_context.split())  # Rough estimate
            logger.info(f"Sending request to Mistral chat API with ~{context_tokens} tokens (word count)")

            while True:
                try:
                    logger.info(f"Calling Mistral chat completion API (attempt {retries+1}/{max_retries})")

                    response = await client.post(
                        settings.EXTERNAL_LLM_URL,
                        headers={"Authorization": f"Bearer {settings.EXTERNAL_LLM_API_KEY}"},
                        json=payload,
                        timeout=60.0  # Increased timeout for larger contexts
                    )

                    # Check if we hit a rate limit
                    if response.status_code == 429:
                        if retries >= max_retries:
                            logger.error(f"Maximum retries reached after rate limit errors")
                            response.raise_for_status()  # This will raise an exception

                        # Get retry delay from headers if available, otherwise use exponential backoff
                        retry_after = int(response.headers.get('retry-after', str(base_delay * (2 ** retries))))
                        # Ensure minimum delay of 1 second
                        retry_after = max(retry_after, 1)

                        logger.warning(f"Rate limit hit. Retrying in {retry_after} seconds (attempt {retries+1}/{max_retries})")
                        await asyncio.sleep(retry_after)
                        retries += 1
                        continue

                    # For other errors, raise immediately
                    response.raise_for_status()

                    # If we get here, the request was successful
                    result = response.json()
                    break

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429 and retries < max_retries:
                        # Get retry delay from headers if available, otherwise use exponential backoff
                        retry_after = int(e.response.headers.get('retry-after', str(base_delay * (2 ** retries))))
                        # Ensure minimum delay of 1 second
                        retry_after = max(retry_after, 1)

                        logger.warning(f"Rate limit hit. Retrying in {retry_after} seconds (attempt {retries+1}/{max_retries})")
                        await asyncio.sleep(retry_after)
                        retries += 1
                    else:
                        # For other errors or if we've exhausted retries, re-raise
                        logger.error(f"Error calling Mistral API: {str(e)}")
                        raise
                except Exception as e:
                    logger.error(f"Unexpected error calling Mistral API: {str(e)}")
                    raise

            # Extract the answer
            answer = result["choices"][0]["message"]["content"]

            # Convert relevant chunks to the response format
            sources = [
                DocumentChunkResponse(
                    text=chunk["text"],
                    metadata=chunk["metadata"]
                )
                for chunk in relevant_chunks
            ]

            # Record usage
            usage_record = UsageRecord(
                user_id=api_key.user_id,
                api_key_id=api_key.id,
                endpoint="/rag",
                model=model_name,
                tokens_used=result["usage"]["total_tokens"],
                latency_ms=float((time.time() - start_time) * 1000),
                status_code=200,
                error=False
            )
            db.add(usage_record)
            db.commit()

            return RAGCompletionResponse(
                answer=answer,
                sources=sources,
                model=model_name,
                usage=result["usage"],
                latency_ms=int((time.time() - start_time) * 1000)
            )

    except Exception as e:
        # Record error
        error_record = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint="/rag",
            model="error",
            tokens_used=0,
            latency_ms=float((time.time() - start_time) * 1000),
            status_code=500,
            error=True,
            error_message=str(e)
        )
        db.add(error_record)
        db.commit()

        # Log the error for debugging
        logger.error(f"RAG request failed: {str(e)}")

        # Provide more specific error messages for common issues
        if "429" in str(e) or "Too Many Requests" in str(e):
            detail = "Rate limit exceeded. The system is experiencing high demand. Please try again in a few moments."
        elif "token limit" in str(e).lower() or "context length" in str(e).lower():
            detail = "The document context is too large for the model. Try using fewer or smaller documents."
        else:
            detail = f"Error processing RAG request: {str(e)}"

        raise HTTPException(
            status_code=500,
            detail=detail
        )


async def create_streaming_completion(
    request: TextCompletionRequest,
    api_key: APIKey,
    db: Session,
    orchestrator: ModelOrchestrator,
):
    """Create a streaming completion for the given prompt or messages"""
    try:
        # Check rate limits
        await check_rate_limits(api_key, db)

        # Prepare request data
        request_data = {}

        # Include either prompt or messages
        if request.prompt:
            request_data["prompt"] = request.prompt
        elif request.messages:
            request_data["messages"] = request.messages
        else:
            raise HTTPException(
                status_code=400,
                detail="Either prompt or messages must be provided"
            )

        # Add other parameters
        request_data["temperature"] = request.temperature

        # Get system settings for max_tokens if not provided
        system_settings = db.query(DBSystemSettings).first()
        if request.max_tokens is not None:
            request_data["max_tokens"] = request.max_tokens
        elif system_settings and system_settings.models and "maxTokens" in system_settings.models:
            # Use system settings for max_tokens
            request_data["max_tokens"] = system_settings.models["maxTokens"]

        if request.top_p is not None:
            request_data["top_p"] = request.top_p
        if request.stop is not None:
            request_data["stop"] = request.stop
        if request.random_seed is not None:
            request_data["random_seed"] = request.random_seed

        # Call the model with streaming enabled
        # This now returns a generator function, not an async generator
        generator_func = await orchestrator.call_model(
            request_data=request_data,
            model_name=request.model,
            api_key=api_key,
            endpoint="/completions",
            stream=True
        )

        # Return a streaming response with the generator function
        return StreamingResponse(
            generator_func(),
            media_type="application/json"
        )

    except Exception as e:
        # Record error
        error_record = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint="/completions",
            model="error",
            tokens_used=0,
            latency_ms=0,
            status_code=500,
            error=True,
            error_message=str(e)
        )
        db.add(error_record)
        db.commit()

        # Log the error for debugging
        logger.error(f"Streaming completion request failed: {str(e)}")

        # Provide more specific error messages for common issues
        if "429" in str(e) or "Too Many Requests" in str(e):
            detail = "Rate limit exceeded. The system is experiencing high demand. Please try again in a few moments."
        elif "token limit" in str(e).lower() or "context length" in str(e).lower():
            detail = "The input is too large for the model. Try using a shorter prompt or fewer messages."
        else:
            detail = f"Error processing streaming completion request: {str(e)}"

        raise HTTPException(
            status_code=500,
            detail=detail
        )


async def create_streaming_rag_completion(
    request: RAGCompletionRequest,
    api_key: APIKey,
    db: Session,
    orchestrator: ModelOrchestrator,
):
    """Create a streaming RAG-based completion using document context"""
    try:
        # Initialize document processor
        doc_processor = DocumentProcessor(db)

        # Determine app_id to use
        app_id_to_use = None
        app_documents = None

        # If app_id is provided, use it directly
        if request.app_id:
            app_id_to_use = request.app_id
            logger.info(f"Using provided app_id: {app_id_to_use}")

        # Try to get app_id from app_slug
        elif hasattr(request, 'app_slug') and request.app_slug:
            from backend.models.deployed_apps import DeployedApp
            app = db.query(DeployedApp).filter(DeployedApp.slug == request.app_slug).first()
            if app:
                app_id_to_use = app.id
                logger.info(f"Found app_id {app_id_to_use} for slug {request.app_slug}")
                # Store the app_id for future use
                request.app_id = app_id_to_use

        # Try to extract app_id from app_slug if it's in the format "rag-chatbot-123"
        if not app_id_to_use and hasattr(request, 'app_slug') and request.app_slug:
            import re
            match = re.search(r'(\d+)$', request.app_slug)
            if match:
                extracted_id = int(match.group(1))
                logger.info(f"Extracted app_id {extracted_id} from slug {request.app_slug}")

                # Check if this ID exists in the database
                from backend.models.deployed_apps import DeployedApp
                app = db.query(DeployedApp).filter(DeployedApp.id == extracted_id).first()
                if app:
                    app_id_to_use = extracted_id
                    logger.info(f"Found app with extracted ID {app_id_to_use}")
                    # Store the app_id for future use
                    request.app_id = app_id_to_use

        # Now get the app documents using the app_id we determined
        if app_id_to_use:
            app_documents = db.query(AppDocument).filter(
                AppDocument.app_id == app_id_to_use,
                AppDocument.is_active.is_(True)
            ).all()
            logger.info(f"Found {len(app_documents)} documents for app_id {app_id_to_use}")

        if not app_documents or len(app_documents) == 0:
            raise HTTPException(
                status_code=404,
                detail="No documents found for this app. Please upload documents first."
            )

        # Get the app ID to use for searching
        if not request.app_id:
            raise HTTPException(
                status_code=400,
                detail="Either app_id or app_slug must be provided"
            )

        search_app_id = request.app_id
        logger.info(f"Using app_id {search_app_id} for document search")

        # Search for relevant document chunks
        relevant_chunks = await doc_processor.search_similar_chunks(
            query=request.query,
            app_id=search_app_id,
            top_k=request.top_k or 3,
            threshold=request.similarity_threshold or 0.7
        )

        # Convert chunks to the format expected by the model
        context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])

        # Prepare messages for the model
        system_prompt = "You are a helpful assistant that answers questions based on the provided document context. When answering, use the information from the documents when available. If the answer is not in the documents, say so clearly and provide a general response based on your knowledge."

        messages = [
            {"role": "system", "content": f"{system_prompt}\n\nDocument Context:\n{context}"},
            {"role": "user", "content": request.query}
        ]

        if request.messages:
            # Add any additional conversation history
            messages.extend(request.messages)

        # Prepare request data for the model
        model_name = request.model or settings.EXTERNAL_MODEL

        # Create request data
        request_data = {
            "messages": messages,
            "temperature": request.temperature or 0.7,
        }

        if request.max_tokens:
            request_data["max_tokens"] = request.max_tokens
        if request.top_p:
            request_data["top_p"] = request.top_p

        # Call the model with streaming enabled
        # This now returns a generator function, not an async generator
        generator_func = await orchestrator.call_model(
            request_data=request_data,
            model_name=model_name,
            api_key=api_key,
            endpoint="/rag",
            stream=True
        )

        # Return a streaming response with the generator function
        return StreamingResponse(
            generator_func(),
            media_type="application/json"
        )

    except Exception as e:
        # Record error
        error_record = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint="/rag",
            model="error",
            tokens_used=0,
            latency_ms=0,
            status_code=500,
            error=True,
            error_message=str(e)
        )
        db.add(error_record)
        db.commit()

        # Log the error for debugging
        logger.error(f"Streaming RAG request failed: {str(e)}")

        # Provide more specific error messages for common issues
        if "429" in str(e) or "Too Many Requests" in str(e):
            detail = "Rate limit exceeded. The system is experiencing high demand. Please try again in a few moments."
        elif "token limit" in str(e).lower() or "context length" in str(e).lower():
            detail = "The document context is too large for the model. Try using fewer or smaller documents."
        else:
            detail = f"Error processing streaming RAG request: {str(e)}"

        raise HTTPException(
            status_code=500,
            detail=detail
        )

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_available_models(
    model_type: Optional[str] = None,
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
