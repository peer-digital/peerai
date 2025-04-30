"""
Schemas for Retrieval Augmented Generation (RAG).
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RAGIndexBase(BaseModel):
    """Base schema for RAG index."""
    name: str
    description: Optional[str] = None
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    deployed_app_id: Optional[int] = None
    embedding_model: str = "mistral-embed"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    index_metadata: Optional[Dict[str, Any]] = None


class RAGIndexCreate(RAGIndexBase):
    """Schema for creating a RAG index."""
    pass


class RAGIndexUpdate(BaseModel):
    """Schema for updating a RAG index."""
    name: Optional[str] = None
    description: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    is_active: Optional[bool] = None
    index_metadata: Optional[Dict[str, Any]] = None


class RAGIndexResponse(RAGIndexBase):
    """Schema for RAG index response."""
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class DocumentBase(BaseModel):
    """Base schema for document."""
    index_id: int
    filename: str
    file_type: str
    file_size: int
    content_type: Optional[str] = None
    external_id: Optional[str] = None
    doc_metadata: Optional[Dict[str, Any]] = None


class DocumentCreate(DocumentBase):
    """Schema for creating a document."""
    pass


class DocumentUpdate(BaseModel):
    """Schema for updating a document."""
    filename: Optional[str] = None
    doc_metadata: Optional[Dict[str, Any]] = None


class DocumentResponse(DocumentBase):
    """Schema for document response."""
    id: int
    content: Optional[str] = None
    is_processed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentChunkBase(BaseModel):
    """Base schema for document chunk."""
    document_id: int
    chunk_index: int
    text: str
    chunk_metadata: Optional[Dict[str, Any]] = None


class DocumentChunkCreate(DocumentChunkBase):
    """Schema for creating a document chunk."""
    embedding: Optional[List[float]] = None


class DocumentChunkResponse(DocumentChunkBase):
    """Schema for document chunk response."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SearchQuery(BaseModel):
    """Schema for search query."""
    query: str
    top_k: int = 3


class SearchResult(BaseModel):
    """Schema for search result."""
    chunk_id: int
    document_id: int
    text: str
    similarity: float


class RAGRequest(BaseModel):
    """Schema for RAG request."""
    messages: List[Dict[str, str]]
    model: str
    temperature: float = 0.7
    index_id: int
    top_k: int = 3
    use_rag: bool = True
