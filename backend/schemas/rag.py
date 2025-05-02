"""
Schemas for RAG (Retrieval Augmented Generation) functionality.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RAGCompletionRequest(BaseModel):
    """Request model for RAG-based completion endpoint"""
    
    query: str
    app_id: int
    messages: Optional[List[Dict[str, str]]] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(default=5, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    model: Optional[str] = None  # Model name to use, or None for default
    # mock_mode is only available in development environment
    mock_mode: Optional[bool] = Field(default=False)


class DocumentChunkResponse(BaseModel):
    """Response model for document chunks"""
    
    text: str
    metadata: Dict[str, Any]


class RAGCompletionResponse(BaseModel):
    """Response model for RAG-based completion endpoint"""
    
    answer: str
    sources: List[DocumentChunkResponse]
    model: str
    usage: Dict[str, int]
    latency_ms: int
