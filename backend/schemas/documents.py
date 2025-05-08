"""
Schemas for document storage and RAG functionality.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    team_id: Optional[int] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    is_processed: Optional[bool] = None
    processing_error: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    uploaded_by_id: int
    storage_path: str
    is_processed: bool
    processing_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentChunkBase(BaseModel):
    document_id: int
    chunk_index: int
    text: str
    chunk_metadata: Optional[Dict[str, Any]] = None


class DocumentChunkCreate(DocumentChunkBase):
    embedding: Optional[List[float]] = None


class DocumentChunkResponse(DocumentChunkBase):
    id: int
    created_at: datetime
    # Note: We don't include the embedding in the response as it can be large

    class Config:
        from_attributes = True


class AppDocumentBase(BaseModel):
    app_id: int
    document_id: int
    is_active: bool = True


class AppDocumentCreate(AppDocumentBase):
    pass


class AppDocumentResponse(AppDocumentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TempDocumentCreate(BaseModel):
    """Request model for creating a temporary document."""
    session_id: str
    filename: str
    content_type: str
    size_bytes: int


class TempDocumentResponse(BaseModel):
    """Response for temporary document upload endpoint."""
    session_id: str
    filename: str
    content_type: str
    size_bytes: int
    storage_path: str
    message: str


class DocumentUploadResponse(BaseModel):
    """Response for document upload endpoint."""
    document_id: int
    filename: str
    content_type: str
    size_bytes: int
    is_queued_for_processing: bool
    message: str
