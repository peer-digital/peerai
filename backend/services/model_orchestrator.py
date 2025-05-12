"""Model orchestrator service for routing requests to the appropriate model provider."""

import httpx
import logging
import os
import json
import time
from typing import Dict, Any, Optional, List, AsyncGenerator, Union
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.models import ModelProvider, AIModel, ModelRequestMapping
from models.usage import UsageRecord
from models.auth import APIKey

# Configure logging
logger = logging.getLogger(__name__)
# Set logging level to INFO for better performance and security
logger.setLevel(logging.INFO)


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
            logger.warning(f"Attempted to use non-existent model: {model_name}")
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

        # Log only non-sensitive model information
        logger.info(f"Processing request for model: {model.name}, Provider: {provider.name}")

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

            # Check if this is an embedding request
            if model.model_type == "embedding" or model.name == "mistral-embed":
                # Handle embedding request
                if "text" in request_data:
                    transformed_request["input"] = request_data["text"]
                    # Don't add text to the transformed request
                    request_data = {k: v for k, v in request_data.items() if k != "text"}
                    logger.info("Using text for embedding input")
                elif "input" in request_data:
                    transformed_request["input"] = request_data["input"]
                    # Don't add input to the transformed request
                    request_data = {k: v for k, v in request_data.items() if k != "input"}
                    logger.info("Using input directly for embedding")

                # Add encoding format
                transformed_request["encoding_format"] = request_data.get("encoding_format", "float")
                request_data = {k: v for k, v in request_data.items() if k != "encoding_format"}
            else:
                # Handle standard chat/completion request
                if "prompt" in request_data:
                    # Convert prompt to messages format for Mistral
                    transformed_request["messages"] = [
                        {"role": "user", "content": request_data["prompt"]}
                    ]
                    # Don't add prompt to the transformed request
                    request_data = {k: v for k, v in request_data.items() if k != "prompt"}
                    logger.info("Converted prompt to messages format")
                elif "messages" in request_data:
                    # Use messages directly
                    transformed_request["messages"] = request_data["messages"]
                    # Don't add messages to the transformed request
                    request_data = {
                        k: v for k, v in request_data.items() if k != "messages"
                    }
                    logger.info("Using messages format directly")

                # Add standard parameters
                if "temperature" in request_data:
                    transformed_request["temperature"] = request_data["temperature"]
                    request_data = {k: v for k, v in request_data.items() if k != "temperature"}

                # Add optional parameters if provided
                for param in ["max_tokens", "top_p", "stop", "random_seed"]:
                    if param in request_data and request_data[param] is not None:
                        transformed_request[param] = request_data[param]
                        request_data = {k: v for k, v in request_data.items() if k != param}

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

        # Log only that the request was transformed
        logger.info(f"Request transformed for {provider.name} model {model.name}")

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

    # We don't need a hardcoded list of allowed models anymore
    # The admin can control which models are active through the Model Management page

    async def call_model(
        self,
        request_data: Dict[str, Any],
        model_name: Optional[str] = None,
        api_key: Optional[APIKey] = None,
        endpoint: str = "/completions",
        stream: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator[bytes, None]]:
        """
        Call a model with the given request data.

        Args:
            request_data: The request data in Peer AI's unified format
            model_name: The name of the model to use, or None to use the default
            api_key: The API key used for the request (for usage tracking)
            endpoint: The API endpoint being called (for usage tracking)
            stream: Whether to stream the response (only supported by some models)

        Returns:
            If stream=False: A dictionary with the model's response in a unified format
            If stream=True: An AsyncGenerator yielding chunks of the streaming response
        """
        start_time = __import__("time").time()

        try:
            # Get the model
            model = (
                self._get_model(model_name) if model_name else self._get_default_model()
            )
            provider = self._get_provider(model.provider_id)

            # Check if the model is active
            if model.status != "active":
                # Log detailed information for debugging, but return a generic error to the user
                logger.warning(f"Attempted to use inactive model: {model.name}")

                # Use a generic error message that doesn't reveal whether the model exists or not
                raise ValueError(f"Model '{model.name}' not found")

            logger.info(f"Selected model: {model.name}, provider: {provider.name}")

            # Transform the request
            transformed_request = self._transform_request(model, request_data)

            # Add streaming parameter if requested
            if stream:
                transformed_request["stream"] = True

            # Get the API key
            provider_api_key = self._get_api_key(provider)

            # Determine the API URL to use
            api_url = provider.api_base_url

            # For embedding models, use a different endpoint
            if model.model_type == "embedding" or model.name == "mistral-embed":
                # Override the URL for embeddings
                api_url = "https://api.mistral.ai/v1/embeddings"
                logger.info(f"Using embeddings endpoint: {api_url}")
                # Streaming is not supported for embeddings
                if stream:
                    raise ValueError("Streaming is not supported for embedding models")

            # Make the API call
            logger.info(f"Calling {provider.name} model {model.name}")

            if stream and provider.name == "mistral":
                # For streaming, we need to return a generator function that can be used with StreamingResponse
                async def stream_generator():
                    try:
                        # Create a copy of the API key info to avoid session issues
                        api_key_copy = None
                        if api_key:
                            try:
                                # Extract only the necessary fields
                                api_key_copy = {
                                    "key": getattr(api_key, "key", None),
                                    "id": getattr(api_key, "id", None),
                                    "user_id": getattr(api_key, "user_id", None)
                                }
                            except Exception as e:
                                logger.error(f"Failed to copy API key info: {str(e)}")

                        async for chunk in self._handle_streaming_response(
                            api_url,
                            provider_api_key,
                            transformed_request,
                            provider.name,
                            model.name,
                            api_key_copy,  # Pass the copy instead of the original
                            endpoint
                        ):
                            yield chunk
                    except Exception as e:
                        logger.error(f"Error in stream_generator: {str(e)}")
                        # Yield an error message as a JSON chunk
                        error_chunk = json.dumps({
                            "error": True,
                            "message": f"Streaming error: {str(e)}"
                        })
                        yield (error_chunk + "\n").encode("utf-8")

                return stream_generator
            else:
                # Standard non-streaming request
                response = await self.http_client.post(
                    api_url,
                    headers={"Authorization": f"Bearer {provider_api_key}"},
                    json=transformed_request,
                    timeout=30.0,
                )

                # Log only the response status
                logger.info(f"Response status: {response.status_code}")

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
                    endpoint=endpoint,
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
            # Check if this is an embedding response
            if "data" in response and "embedding" in response.get("data", [{}])[0]:
                # This is an embedding response
                return {
                    "embedding": response["data"][0]["embedding"],
                    "provider": provider_name,
                    "model": model_name,
                    "usage": response.get("usage", {"total_tokens": 0}),
                }
            else:
                # This is a standard chat/completion response
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

    async def _handle_streaming_response(
        self,
        api_url: str,
        provider_api_key: str,
        transformed_request: Dict[str, Any],
        provider_name: str,
        model_name: str,
        api_key: Optional[Union[APIKey, Dict[str, Any]]] = None,
        endpoint: str = "/completions",
    ) -> AsyncGenerator[bytes, None]:
        """
        Handle streaming response from the model provider.

        Args:
            api_url: The API URL to call
            provider_api_key: The API key for the provider
            transformed_request: The transformed request data
            provider_name: The name of the provider
            model_name: The name of the model
            api_key: The API key used for the request (for usage tracking)
            endpoint: The API endpoint being called (for usage tracking)

        Returns:
            An async generator that yields chunks of the response
        """
        logger.info(f"Streaming response from {provider_name} model {model_name}")

        # Extract API key information before streaming starts to avoid session issues
        api_key_info = None
        if api_key:
            try:
                # Check if api_key is already a dictionary (from stream_generator)
                if isinstance(api_key, dict):
                    api_key_info = api_key
                else:
                    # Store the necessary information to record usage later
                    api_key_info = {
                        "key": getattr(api_key, "key", None),
                        "id": getattr(api_key, "id", None),
                        "user_id": getattr(api_key, "user_id", None)
                    }
            except Exception as e:
                # If we can't access the API key attributes, log the error and continue
                logger.error(f"Failed to extract API key info: {str(e)}")
                # Create a minimal info dict with None values
                api_key_info = {
                    "key": None,
                    "id": None,
                    "user_id": None
                }

        # Create a new client with stream=True
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                api_url,
                headers={"Authorization": f"Bearer {provider_api_key}"},
                json=transformed_request,
                timeout=60.0,
            ) as response:
                response.raise_for_status()

                # Track total tokens for usage recording
                total_tokens = 0

                # Track if we've added sources to any chunk
                sources_added = False
                # Track if we've seen the final chunk with finish_reason="stop"
                final_chunk_seen = False
                # Store all chunks to identify the last one
                chunks = []
                # Store the final chunk data for modification
                final_chunk_data = None
                # Store the chunk ID for creating additional chunks
                chunk_id = None

                # First collect all chunks
                async for chunk in response.aiter_lines():
                    if chunk.strip():
                        chunks.append(chunk)

                # Now process each chunk
                for i, chunk in enumerate(chunks):
                    # Process the chunk (remove "data: " prefix if present)
                    if chunk.startswith("data: "):
                        chunk = chunk[6:]

                    # Skip "[DONE]" message
                    if chunk == "[DONE]":
                        continue

                    try:
                        # Parse the chunk as JSON
                        chunk_data = json.loads(chunk)

                        # Store the chunk ID for creating additional chunks if needed
                        if "id" in chunk_data and chunk_id is None:
                            chunk_id = chunk_data["id"]

                        # Extract token count if available
                        if "usage" in chunk_data and "total_tokens" in chunk_data["usage"]:
                            total_tokens = chunk_data["usage"]["total_tokens"]
                            logger.info(f"Found usage in chunk: {chunk_data['usage']}")

                        # Check if this is the final chunk (has finish_reason="stop")
                        is_final_chunk = False
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            if chunk_data["choices"][0].get("finish_reason") == "stop":
                                is_final_chunk = True
                                final_chunk_seen = True
                                final_chunk_data = chunk_data
                                logger.info(f"Found final chunk with finish_reason=stop")

                                # For the final chunk, add the sources
                                if endpoint == "/rag" and "sources" in transformed_request:
                                    logger.info(f"Adding sources to final chunk: {len(transformed_request['sources'])}")
                                    chunk_data["sources"] = transformed_request.get("sources", [])
                                    # Re-serialize the modified chunk
                                    chunk = json.dumps(chunk_data)

                        # For RAG responses, handle sources for the first chunk
                        if endpoint == "/rag" and "choices" in chunk_data and not sources_added:
                            # For the first chunk, add an empty sources array to indicate it's a RAG response
                            chunk_data["sources"] = []
                            sources_added = True
                            logger.info(f"Added empty sources array to first chunk for RAG response")
                            # Re-serialize the modified chunk
                            chunk = json.dumps(chunk_data)

                        # Yield the chunk
                        yield (chunk + "\n").encode("utf-8")
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse chunk as JSON: {chunk}")
                        # Still yield the chunk even if it's not valid JSON
                        yield (chunk + "\n").encode("utf-8")

                # If we didn't see a final chunk with finish_reason="stop", but we have sources,
                # create and yield an additional chunk with the sources
                if not final_chunk_seen and "sources" in transformed_request and endpoint == "/rag":
                    logger.info(f"No final chunk with finish_reason=stop found, creating additional chunk with sources")

                    # Create a new chunk with the sources
                    additional_chunk = {
                        "id": chunk_id or "additional-chunk",
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": "mistral-large-latest",
                        "choices": [{"index": 0, "delta": {"content": ""}, "finish_reason": "stop"}],
                        "sources": transformed_request.get("sources", [])
                    }

                    # Add usage if we have it
                    if total_tokens > 0:
                        additional_chunk["usage"] = {"total_tokens": total_tokens}

                    # Yield the additional chunk
                    yield (json.dumps(additional_chunk) + "\n").encode("utf-8")

                # Record usage if we have API key info
                if api_key_info and api_key_info["key"] != "test_key_123":
                    try:
                        # Calculate latency
                        latency_ms = int((response.elapsed.total_seconds()) * 1000)

                        # Create usage record directly instead of using _record_usage
                        usage = UsageRecord(
                            user_id=api_key_info["user_id"],
                            api_key_id=api_key_info["id"],
                            endpoint=endpoint,
                            model=model_name,
                            tokens_used=total_tokens,
                            latency_ms=latency_ms,
                            status_code=200,
                            error=False
                        )
                        self.db.add(usage)
                        self.db.commit()
                    except Exception as e:
                        # Log but don't fail if usage recording fails
                        logger.error(f"Failed to record streaming usage: {str(e)}")
                        # Don't re-raise the exception to avoid breaking the streaming response

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
