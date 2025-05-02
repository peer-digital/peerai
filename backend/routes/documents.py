"""
API routes for document management and RAG functionality.
"""
import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models.auth import User
from backend.models.documents import Document, DocumentChunk, AppDocument
from backend.schemas.documents import (
    DocumentResponse,
    DocumentUploadResponse,
    AppDocumentCreate,
    AppDocumentResponse,
)
from backend.core.security import get_current_user
from backend.config import settings
from backend.services.document_processor import DocumentProcessor
from fastapi.security import APIKeyHeader

# Define API key headers for public access
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)
x_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    team_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document for RAG processing.
    """
    # Validate file size
    max_size = 10 * 1024 * 1024  # 10MB
    file_size = 0

    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(uploads_dir, exist_ok=True)

    # Generate a unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(uploads_dir, unique_filename)

    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            # Read and write in chunks to avoid loading large files into memory
            chunk_size = 1024 * 1024  # 1MB chunks
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > max_size:
                    # Clean up the partial file
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Maximum size is {max_size / (1024 * 1024)}MB",
                    )
                buffer.write(chunk)
    except Exception as e:
        # Clean up in case of error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}",
        )

    # Create document record in database
    document = Document(
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=file_size,
        uploaded_by_id=current_user.id,
        team_id=team_id,
        storage_path=file_path,
        is_processed=False,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Process the document immediately
    # In a production environment, this would be done asynchronously with a task queue
    try:
        # Initialize document processor
        doc_processor = DocumentProcessor(db)

        # Process the document (extract text and generate embeddings)
        processing_success = await doc_processor.process_document(document.id)

        if processing_success:
            message = "Document uploaded and processed successfully"
        else:
            message = "Document uploaded but processing failed"
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        message = "Document uploaded but processing failed"

    return DocumentUploadResponse(
        document_id=document.id,
        filename=document.filename,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        is_queued_for_processing=True,  # Keep this for backward compatibility
        message=f"{message} (Note: Original file will be deleted after text extraction and embedding generation)",
    )


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List documents uploaded by the current user or their team.
    """
    query = db.query(Document)

    # Filter by user or team
    if team_id:
        # Check if user is part of the team
        if current_user.team_id != team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this team's documents",
            )
        query = query.filter(Document.team_id == team_id)
    else:
        # Show user's personal documents
        query = query.filter(Document.uploaded_by_id == current_user.id)

    documents = query.order_by(Document.created_at.desc()).all()
    return documents


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a document and its associated chunks.
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check if user has permission to delete
    if document.uploaded_by_id != current_user.id and (
        not document.team_id or document.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this document",
        )

    # Delete the file from storage
    try:
        if os.path.exists(document.storage_path):
            os.remove(document.storage_path)
    except Exception as e:
        # Log the error but continue with database deletion
        print(f"Error deleting file {document.storage_path}: {str(e)}")

    # Explicitly delete all chunks associated with this document
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
    for chunk in chunks:
        db.delete(chunk)

    # Then delete the document itself
    db.delete(document)
    db.commit()

    return None


@router.post("/app-documents", response_model=AppDocumentResponse)
async def associate_document_with_app(
    payload: AppDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Associate a document with a deployed app.
    """
    # Check if document exists
    document = db.query(Document).filter(Document.id == payload.document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check if user has permission to access the document
    if document.uploaded_by_id != current_user.id and (
        not document.team_id or document.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to use this document",
        )

    # Check if app exists and user has access
    from backend.models.deployed_apps import DeployedApp
    app = db.query(DeployedApp).filter(DeployedApp.id == payload.app_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Check if user has permission to modify the app
    if app.deployed_by_id != current_user.id and (
        not app.team_id or app.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this app",
        )

    # Create the association
    try:
        app_document = AppDocument(**payload.model_dump())
        db.add(app_document)
        db.commit()
        db.refresh(app_document)
        return app_document
    except IntegrityError:
        db.rollback()
        # Check if association already exists
        existing = db.query(AppDocument).filter(
            AppDocument.app_id == payload.app_id,
            AppDocument.document_id == payload.document_id
        ).first()

        if existing:
            # If it exists but is inactive, reactivate it
            if not existing.is_active:
                existing.is_active = True
                db.commit()
                db.refresh(existing)
                return existing

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This document is already associated with the app",
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error associating document with app",
        )


@router.get("/app/{app_id}", response_model=List[DocumentResponse])
async def list_app_documents(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List documents associated with a specific app.
    """
    # Check if app exists and user has access
    from backend.models.deployed_apps import DeployedApp
    app = db.query(DeployedApp).filter(DeployedApp.id == app_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Check if user has permission to view the app
    if app.deployed_by_id != current_user.id and (
        not app.team_id or app.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this app's documents",
        )

    # Get documents associated with the app
    documents = (
        db.query(Document)
        .join(AppDocument)
        .filter(AppDocument.app_id == app_id, AppDocument.is_active.is_(True))
        .all()
    )

    return documents


@router.post("/{document_id}/process", response_model=DocumentResponse)
async def process_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually process a document to generate embeddings.
    """
    # Check if document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check if user has permission to access the document
    if document.uploaded_by_id != current_user.id and (
        not document.team_id or document.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to process this document",
        )

    # Process the document (this will also delete the file after processing)
    doc_processor = DocumentProcessor(db)
    success = await doc_processor.process_document(document_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process document. The file will be kept for retry.",
        )

    # Refresh document data
    db.refresh(document)
    return document


@router.delete("/app-documents/{app_id}/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document_from_app(
    app_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a document's association with an app.
    """
    # Check if app exists and user has access
    from backend.models.deployed_apps import DeployedApp
    app = db.query(DeployedApp).filter(DeployedApp.id == app_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Check if user has permission to modify the app
    if app.deployed_by_id != current_user.id and (
        not app.team_id or app.team_id != current_user.team_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this app",
        )

    # Find the association
    app_document = db.query(AppDocument).filter(
        AppDocument.app_id == app_id,
        AppDocument.document_id == document_id
    ).first()

    if not app_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document is not associated with this app",
        )

    # Remove the association (soft delete)
    app_document.is_active = False
    db.commit()

    return None


@router.get("/app/{app_slug}", response_model=List[DocumentResponse])
async def list_public_app_documents(
    app_slug: str,
    db: Session = Depends(get_db),
    auth_header: str = Depends(api_key_header),
    x_api_key: str = Depends(x_api_key_header),
):
    """
    List documents associated with a specific app for public access.
    This endpoint is used by the RAG chatbot to retrieve documents.
    """
    # Try to get API key from different headers
    api_key = None

    # Check Authorization header
    if auth_header and auth_header.startswith("Bearer "):
        api_key = auth_header.replace("Bearer ", "")

    # If no API key in Authorization header, try X-API-Key header
    if not api_key and x_api_key:
        api_key = x_api_key

    # Check if we have a valid API key
    if not api_key or not api_key.startswith("pk_"):
        print(f"Invalid API key format: {api_key}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Find the app by slug
    from backend.models.deployed_apps import DeployedApp
    app = db.query(DeployedApp).filter(
        DeployedApp.slug == app_slug,
        DeployedApp.is_active.is_(True)
    ).first()

    if not app:
        print(f"App not found: {app_slug}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    print(f"Found app: {app.id} ({app.slug})")

    # Get documents associated with the app
    documents = (
        db.query(Document)
        .join(AppDocument)
        .filter(AppDocument.app_id == app.id, AppDocument.is_active.is_(True))
        .all()
    )

    print(f"Found {len(documents)} documents for app {app.slug}")

    return documents