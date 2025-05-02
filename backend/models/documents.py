"""
Models for document storage and RAG functionality.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON, ARRAY
from .base import Base


class Document(Base):
    """
    Model for storing document metadata.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)  # Null for organization-wide documents
    storage_path = Column(String, nullable=False)  # Path to the file in storage
    is_processed = Column(Boolean, default=False)  # Whether the document has been processed for embeddings
    processing_error = Column(Text, nullable=True)  # Error message if processing failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    uploaded_by = relationship("User", backref="uploaded_documents")
    team = relationship("Team", backref="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    app_documents = relationship("AppDocument", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """
    Model for storing document chunks and their embeddings.
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Index of the chunk within the document
    text = Column(Text, nullable=False)  # The text content of the chunk
    embedding = Column(ARRAY(Float), nullable=True)  # Vector embedding of the chunk
    chunk_metadata = Column(JSON, nullable=True)  # Additional metadata about the chunk
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class AppDocument(Base):
    """
    Model for associating documents with deployed apps.
    """
    __tablename__ = "app_documents"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("deployed_apps.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    app = relationship("DeployedApp", back_populates="documents")
    document = relationship("Document", back_populates="app_documents")
