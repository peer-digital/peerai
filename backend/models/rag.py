"""
Database models for Retrieval Augmented Generation (RAG).
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from .base import Base


class RAGIndex(Base):
    """
    Model for RAG vector indexes.
    Each index belongs to a user, team, or deployed app.
    """
    __tablename__ = "rag_indexes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    deployed_app_id = Column(Integer, ForeignKey("deployed_apps.id"), nullable=True)
    embedding_model = Column(String, default="mistral-embed")
    chunk_size = Column(Integer, default=1000)
    chunk_overlap = Column(Integer, default=200)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    index_metadata = Column(JSON, nullable=True)  # Renamed from metadata to avoid SQLAlchemy conflict

    # Relationships
    user = relationship("User", backref="rag_indexes")
    team = relationship("Team", backref="rag_indexes")
    deployed_app = relationship("DeployedApp", backref="rag_indexes")
    documents = relationship("Document", back_populates="index", cascade="all, delete-orphan")


class Document(Base):
    """
    Model for documents uploaded to RAG indexes.
    """
    __tablename__ = "rag_documents"

    id = Column(Integer, primary_key=True, index=True)
    index_id = Column(Integer, ForeignKey("rag_indexes.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, txt, docx, md
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=True)
    content = Column(Text, nullable=True)  # Full document content in markdown format
    external_id = Column(String, nullable=True)  # For external document references
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    doc_metadata = Column(JSON, nullable=True)

    # Relationships
    index = relationship("RAGIndex", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """
    Model for document chunks with embeddings.
    """
    __tablename__ = "rag_document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("rag_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(ARRAY(Float), nullable=True)  # Vector embedding
    created_at = Column(DateTime, default=datetime.utcnow)
    chunk_metadata = Column(JSON, nullable=True)  # Renamed from metadata to avoid SQLAlchemy conflict

    # Relationships
    document = relationship("Document", back_populates="chunks")
