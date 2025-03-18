"""Model orchestrator service for routing requests to the appropriate model provider."""

import httpx
import logging
import os
import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.models import ModelProvider, AIModel, ModelRequestMapping
from models.usage import UsageRecord
from models.auth import APIKey

# Configure logging
logger = logging.getLogger(__name__)
# Set logging level to DEBUG for development
logger.setLevel(logging.DEBUG)


class ModelOrchestrator:
    """
    Orchestrator for routing model requests to the appropriate provider.

    This class handles:
    1. Looking up model information from the registry
    2. Transforming requests to the provider-specific format
    3. Making API calls to the provider
    4. Transforming responses back to a unified format
    5. Handling errors and fallbacks
    """

    def __init__(self, db: Session, http_client: Optional[httpx.AsyncClient] = None):
        """Initialize the orchestrator with a database session."""
        self.db = db
        self.http_client = http_client or httpx.AsyncClient(timeout=30.0)
        self._provider_cache = {}
        self._model_cache = {}
        self._mapping_cache = {}

    async def close(self):
        """Close the HTTP client."""
        if self.http_client:
            await self.http_client.aclose()

    def _get_provider(self, provider_id: int) -> ModelProvider:
        """Get a provider from the cache or database."""
        if provider_id in self._provider_cache:
            return self._provider_cache[provider_id]

        provider = (
            self.db.query(ModelProvider).filter(ModelProvider.id == provider_id).first()
        )
        if not provider:
            raise ValueError(f"Provider with ID {provider_id} not found")

        self._provider_cache[provider_id] = provider
        return provider

    def _get_model(self, model_name: str) -> AIModel:
        """Get a model from the cache or database."""
        if model_name in self._model_cache:
            return self._model_cache[model_name]

        model = self.db.query(AIModel).filter(AIModel.name == model_name).first()
        if not model:
            raise ValueError(f"Model '{model_name}' not found")

        self._model_cache[model_name] = model
        return model

    def _get_default_model(self, model_type: str = "text") -> AIModel:
        """Get the default model for a given type."""
        model = (
            self.db.query(AIModel)
            .filter(AIModel.model_type == model_type, AIModel.is_default.is_(True))
            .first()
        )
        if not model:
            raise ValueError(f"No default model found for type '{model_type}'")
        
        return model

    def _get_parameter_mappings(self, model_id: int) -> Dict[str, ModelRequestMapping]:
        """Get parameter mappings for a model."""
        if model_id in self._mapping_cache:
            return self._mapping_cache[model_id]

        mappings = (
            self.db.query(ModelRequestMapping)
            .filter(ModelRequestMapping.model_id == model_id)
            .all()
        )

        mapping_dict = {mapping.peer_param: mapping for mapping in mappings}
        self._mapping_cache[model_id] = mapping_dict
        return mapping_dict

    def _transform_request(
        self, model: AIModel, request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform a request to the provider-specific format."""
        mappings = self._get_parameter_mappings(model.id)
        provider = self._get_provider(model.provider_id)

        # Log the input request data
        logger.info(f"Original request data: {request_data}")
        logger.debug(f"Model: {model.name}, Provider: {provider.name}")
        logger.debug(f"Model config: {model.config}")

        # Start with a clean request
        transformed_request = {}

        # Add the model name if the provider requires it
        if provider.name == "mistral":
            # Use the api_model_id from config if available, otherwise use the model name
            api_model_id = (
                model.config.get("api_model_id", model.name)
                if model.config
                else model.name
            )
            logger.debug(f"Using Mistral API model ID: {api_model_id}")
            transformed_request["model"] = api_model_id

            # Handle prompt conversion for Mistral API
            if "prompt" in request_data:
                # Convert prompt to messages format for Mistral
                transformed_request["messages"] = [
                    {"role": "user", "content": request_data["prompt"]}
                ]
                # Don't add prompt to the transformed request
                request_data = {k: v for k, v in request_data.items() if k != "prompt"}
                logger.info(
                    f"Converted prompt to messages format: {transformed_request['messages']}"
                )
            elif "messages" in request_data:
                # Use messages directly
                transformed_request["messages"] = request_data["messages"]
                # Don't add messages to the transformed request
                request_data = {
                    k: v for k, v in request_data.items() if k != "messages"
                }
                logger.info(
                    f"Using messages directly: {transformed_request['messages']}"
                )

            # Handle standard Mistral API parameters
            mistral_params = [
                "max_tokens", "temperature", "top_p", "stop", 
                "random_seed", "safe_prompt", "presence_penalty", "frequency_penalty"
            ]
            
            for param in mistral_params:
                if param in request_data and request_data[param] is not None:
                    transformed_request[param] = request_data[param]
                    # Remove from request_data so we don't process it again
                    request_data = {k: v for k, v in request_data.items() if k != param}
            
            # Remove stream parameter as it's not fully implemented yet
            if "stream" in transformed_request:
                del transformed_request["stream"]
            if "stream" in request_data:
                request_data = {k: v for k, v in request_data.items() if k != "stream"}

            # Add other parameters from model config, excluding description and api_model_id
            if model.config:
                for key, value in model.config.items():
                    if key not in ["description", "api_model_id"]:
                        transformed_request[key] = value
        else:
            # For other providers, start with the model config
            if model.config:
                transformed_request = model.config.copy()

        # Transform each parameter according to the mappings
        for peer_param, value in request_data.items():
            if peer_param in mappings:
                mapping = mappings[peer_param]
                provider_param = mapping.provider_param

                # Apply transformation function if specified
                if mapping.transform_function:
                    value = self._apply_transform(
                        mapping.transform_function, value, request_data
                    )

                transformed_request[provider_param] = value

        # Log the transformed request
        logger.info(
            f"Transformed request for {provider.name} model {model.name}: {transformed_request}"
        )

        return transformed_request

    def _apply_transform(
        self, function_name: str, value: Any, request_data: Dict[str, Any]
    ) -> Any:
        """Apply a transformation function to a parameter value."""
        if function_name == "format_as_chat_message":
            # Transform a prompt string into a chat message format
            return [{"role": "user", "content": value}]

        # Add more transformation functions as needed
        return value

    def _get_api_key(self, provider: ModelProvider) -> str:
        """
        Get the API key for a provider.

        This method supports two ways of retrieving API keys:
        1. From environment variables (current implementation)
        2. From the database (future implementation)

        For now, we use environment variables, but this method can be extended
        to support database-stored keys in the future.
        """
        # First check if the provider has a direct api_key field (future implementation)
        # if provider.api_key:
        #     return decrypt_api_key(provider.api_key)

        # Fall back to environment variables
        env_var = provider.api_key_env_var
        api_key = os.environ.get(env_var)

        if not api_key:
            raise ValueError(
                f"API key not found for provider '{provider.name}'. Set the {env_var} environment variable."
            )

        return api_key

    async def call_model(
        self,
        request_data: Dict[str, Any],
        model_name: Optional[str] = None,
        api_key: Optional[APIKey] = None,
    ) -> Dict[str, Any]:
        """
        Call a model with the given request data.

        Args:
            request_data: The request data in Peer AI's unified format
            model_name: The name of the model to use, or None to use the default
            api_key: The API key used for the request (for usage tracking)

        Returns:
            A dictionary with the model's response in a unified format
        """
        start_time = __import__("time").time()

        try:
            # Get the model
            model = (
                self._get_model(model_name) if model_name else self._get_default_model()
            )
            provider = self._get_provider(model.provider_id)

            logger.debug(f"Selected model: {model.name}, provider: {provider.name}")
            logger.debug(f"Model config: {model.config}")

            # Transform the request
            transformed_request = self._transform_request(model, request_data)

            # Get the API key
            provider_api_key = self._get_api_key(provider)

            # Make the API call
            logger.info(f"Calling {provider.name} model {model.name}")
            logger.debug(f"API URL: {provider.api_base_url}")
            logger.debug(f"Request payload: {json.dumps(transformed_request)}")

            response = await self.http_client.post(
                provider.api_base_url,
                headers={"Authorization": f"Bearer {provider_api_key}"},
                json=transformed_request,
                timeout=30.0,
            )

            # Log the response status and headers
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response headers: {response.headers}")

            # Log the response content
            try:
                response_content = response.text
                logger.info(f"Response content: {response_content[:500]}...")  # Log first 500 chars
            except Exception as e:
                logger.error(f"Error logging response content: {str(e)}")

            response.raise_for_status()
            result = response.json()

            # Transform the response to a unified format
            unified_response = self._transform_response(
                provider.name, model.name, result
            )

            # Calculate latency
            latency_ms = int((__import__("time").time() - start_time) * 1000)
            unified_response["latency_ms"] = latency_ms

            # Record usage if an API key was provided
            if api_key:
                self._record_usage(
                    api_key=api_key,
                    model=model.name,
                    tokens_used=unified_response.get("usage", {}).get(
                        "total_tokens", 0
                    ),
                    latency_ms=latency_ms,
                    endpoint="/completions",
                    status_code=200,
                )

            return unified_response

        except Exception as e:
            # Log the error details
            logger.error(f"Error calling model: {str(e)}")
            if hasattr(e, "response") and e.response is not None:
                try:
                    error_content = e.response.text
                    logger.error(f"Error response content: {error_content}")
                except:
                    pass

            # Calculate error latency
            error_latency = int((__import__("time").time() - start_time) * 1000)

            # Record error if an API key was provided
            if api_key:
                self._record_usage(
                    api_key=api_key,
                    model=model_name or "unknown",
                    tokens_used=0,
                    latency_ms=error_latency,
                    endpoint="/completions",
                    status_code=getattr(e, "status_code", 500),
                    error_message=str(e),
                )

            # Re-raise as HTTPException
            if isinstance(e, HTTPException):
                raise

            raise HTTPException(
                status_code=502,
                detail=f"Model provider error: {str(e)}",
            )

    def _transform_response(
        self, provider_name: str, model_name: str, response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform a provider-specific response to a unified format."""
        if provider_name == "hosted":
            # Hosted LLM response format
            return {
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": response.get("text", ""),
                        },
                        "finish_reason": "stop",
                    }
                ],
                "provider": provider_name,
                "model": model_name,
                "usage": response.get("usage", {"total_tokens": 0}),
            }

        elif provider_name == "mistral":
            # Mistral response is already in a similar format
            return {
                "choices": response.get("choices", []),
                "provider": provider_name,
                "model": model_name,
                "usage": response.get("usage", {"total_tokens": 0}),
            }

        # Default fallback
        return {
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": str(response)},
                    "finish_reason": "stop",
                }
            ],
            "provider": provider_name,
            "model": model_name,
            "usage": {"total_tokens": 0},
        }

    def _record_usage(
        self,
        api_key: APIKey,
        model: str,
        tokens_used: int,
        latency_ms: float,
        endpoint: str,
        status_code: int,
        error_message: Optional[str] = None,
    ):
        """Record API usage."""
        if api_key.key == "test_key_123":
            return

        usage = UsageRecord(
            user_id=api_key.user_id,
            api_key_id=api_key.id,
            endpoint=endpoint,
            model=model,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
            status_code=status_code,
            error=status_code >= 400,
            error_type="api_error" if status_code >= 400 else None,
            error_message=error_message,
        )
        self.db.add(usage)
        self.db.commit()

    def get_available_models(self, model_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get a list of available models."""
        query = self.db.query(AIModel).join(ModelProvider)
        
        if model_type:
            query = query.filter(AIModel.model_type == model_type)
        
        models = query.filter(
            AIModel.status == "active",
            ModelProvider.is_active.is_(True)
        ).all()
        
        return [
            {
                "id": model.id,
                "name": model.name,
                "display_name": model.display_name,
                "provider": model.provider.name,
                "provider_display_name": model.provider.display_name,
                "model_type": model.model_type,
                "capabilities": model.capabilities,
                "context_window": model.context_window,
                "is_default": model.is_default,
                "cost_per_1k_input_tokens": model.cost_per_1k_input_tokens,
                "cost_per_1k_output_tokens": model.cost_per_1k_output_tokens,
            }
            for model in models
        ]
