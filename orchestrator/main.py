import httpx
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelProvider(str, Enum):
    HOSTED = "hosted"  # Bahnhof-hosted model
    EXTERNAL = "external"  # Swedish external provider
    MOCK = "mock"  # For testing


class InferenceRequest(BaseModel):
    prompt: str
    max_tokens: int = Field(default=100, le=2048)
    temperature: float = Field(default=0.7, ge=0, le=1)
    provider: Optional[ModelProvider] = Field(default=ModelProvider.HOSTED)


class InferenceResponse(BaseModel):
    text: str
    provider: ModelProvider
    tokens_used: int
    latency_ms: float


class Orchestrator:
    def __init__(
        self,
        hosted_url: str,
        external_url: str,
        hosted_api_key: str,
        external_api_key: str,
        mock_mode: bool = False,
    ):
        self.hosted_url = hosted_url
        self.external_url = external_url
        self.hosted_api_key = hosted_api_key
        self.external_api_key = external_api_key
        self.mock_mode = mock_mode
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def _call_hosted_model(self, request: InferenceRequest) -> Dict[str, Any]:
        """Call the Bahnhof-hosted model"""
        try:
            response = await self.http_client.post(
                self.hosted_url,
                headers={"Authorization": f"Bearer {self.hosted_api_key}"},
                json=request.model_dump(),
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Hosted model error: {str(e)}")
            raise

    async def _call_external_model(self, request: InferenceRequest) -> Dict[str, Any]:
        """Call the external Swedish provider"""
        try:
            response = await self.http_client.post(
                self.external_url,
                headers={"Authorization": f"Bearer {self.external_api_key}"},
                json=request.model_dump(),
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"External model error: {str(e)}")
            raise

    def _get_mock_response(self, request: InferenceRequest) -> Dict[str, Any]:
        """Return mock data for testing"""
        return {
            "text": f"Mock response for prompt: {request.prompt[:50]}...",
            "provider": ModelProvider.MOCK,
            "tokens_used": len(request.prompt.split()),
            "latency_ms": 100.0,
        }

    async def generate(self, request: InferenceRequest) -> InferenceResponse:
        """Main entry point for inference with fallback logic"""
        if self.mock_mode:
            return InferenceResponse(**self._get_mock_response(request))

        try:
            # Try primary provider first
            if request.provider == ModelProvider.HOSTED:
                response = await self._call_hosted_model(request)
                return InferenceResponse(**response)

            # Try external provider
            if request.provider == ModelProvider.EXTERNAL:
                response = await self._call_external_model(request)
                return InferenceResponse(**response)

        except Exception as e:
            logger.warning(f"Primary provider failed, attempting fallback: {str(e)}")
            try:
                # Fallback to external provider
                response = await self._call_external_model(request)
                return InferenceResponse(**response)
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {str(fallback_error)}")
                raise Exception("All providers failed")
