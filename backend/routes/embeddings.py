"""
API routes for embedding generation.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.models.auth import APIKey
from backend.services.model_orchestrator import ModelOrchestrator
from backend.routes.inference import get_api_key, check_rate_limits

router = APIRouter()


class EmbeddingResponse(BaseModel):
    """Response model for embedding endpoint."""
    embedding: List[float]
    provider: str
    model: str
    usage: Dict[str, Any]
    latency_ms: Optional[int] = None


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(
    text: str,
    api_key: APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """
    Generate an embedding for the given text.

    This endpoint uses the ModelOrchestrator to generate embeddings,
    which ensures proper API key management and usage tracking.
    """
    # Check rate limits
    await check_rate_limits(api_key, db)

    try:
        # Initialize the ModelOrchestrator
        orchestrator = ModelOrchestrator(db)

        # Prepare the request data
        request_data = {
            "text": text,
            "encoding_format": "float"
        }

        # Call the model through the orchestrator
        result = await orchestrator.call_model(
            request_data=request_data,
            model_name="mistral-embed",
            api_key=api_key,
            endpoint="/embeddings"
        )

        # Close the orchestrator's HTTP client
        await orchestrator.close()

        return result

    except Exception as e:
        # Close the orchestrator's HTTP client if it exists
        if 'orchestrator' in locals():
            await orchestrator.close()

        raise HTTPException(
            status_code=500,
            detail=f"Error generating embedding: {str(e)}"
        )
