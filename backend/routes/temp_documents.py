"""
API routes for temporary document storage before app deployment.
"""
import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.auth import User
from backend.models.documents import Document, AppDocument
from backend.schemas.documents import (
    DocumentResponse,
    TempDocumentResponse,
)
from backend.routes.auth import get_current_user
from backend.config import settings

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/temp-documents",
    tags=["temp-documents"],
)


@router.post("/upload", response_model=TempDocumentResponse)
async def upload_temp_document(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document to temporary storage before app deployment.
    """
    # Validate file size
    max_size = 10 * 1024 * 1024  # 10MB
    file_size = 0

    # Create temp uploads directory if it doesn't exist
    temp_uploads_dir = os.path.join(settings.UPLOAD_DIR, "temp", session_id)
    os.makedirs(temp_uploads_dir, exist_ok=True)

    # Generate a unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(temp_uploads_dir, unique_filename)

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

    # Return metadata about the temporary file
    return TempDocumentResponse(
        session_id=session_id,
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=file_size,
        storage_path=file_path,
        message="File uploaded to temporary storage. It will be processed when the app is deployed.",
    )


@router.post("/process/{app_id}", response_model=List[DocumentResponse])
async def process_temp_documents(
    app_id: int,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process temporary documents and associate them with a deployed app.
    """
    # Check if the app exists and belongs to the user
    from backend.models.deployed_apps import DeployedApp
    app = db.query(DeployedApp).filter(DeployedApp.id == app_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Check if the user has permission to access the app
    if app.deployed_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this app",
        )

    # Get the temporary files directory
    temp_uploads_dir = os.path.join(settings.UPLOAD_DIR, "temp", session_id)
    if not os.path.exists(temp_uploads_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No temporary files found for this session",
        )

    # Process each file in the directory
    processed_documents = []

    try:
        for filename in os.listdir(temp_uploads_dir):
            file_path = os.path.join(temp_uploads_dir, filename)
            if os.path.isfile(file_path):
                # Get file info
                file_size = os.path.getsize(file_path)

                # Determine content type based on extension
                content_type = "application/octet-stream"  # Default
                if filename.endswith(".pdf"):
                    content_type = "application/pdf"
                elif filename.endswith(".txt"):
                    content_type = "text/plain"
                elif filename.endswith(".docx"):
                    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                elif filename.endswith(".md"):
                    content_type = "text/markdown"

                # Create permanent uploads directory
                uploads_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
                os.makedirs(uploads_dir, exist_ok=True)

                # Move file to permanent location
                permanent_filename = f"{uuid.uuid4()}{os.path.splitext(filename)[1]}"
                permanent_path = os.path.join(uploads_dir, permanent_filename)
                os.rename(file_path, permanent_path)

                # Create document record
                document = Document(
                    filename=os.path.basename(filename),
                    content_type=content_type,
                    size_bytes=file_size,
                    uploaded_by_id=current_user.id,
                    team_id=None,  # No team association for now
                    storage_path=permanent_path,
                    is_processed=False,
                )

                db.add(document)
                db.commit()
                db.refresh(document)

                # Associate document with app
                app_document = AppDocument(
                    app_id=app_id,
                    document_id=document.id,
                    is_active=True,
                )

                db.add(app_document)
                db.commit()

                # Process the document
                from backend.services.document_processor import DocumentProcessor
                doc_processor = DocumentProcessor(db)
                await doc_processor.process_document(document.id)

                # Refresh document data
                db.refresh(document)
                processed_documents.append(document)

        # Clean up the temporary directory if it exists
        try:
            if os.path.exists(temp_uploads_dir):
                os.rmdir(temp_uploads_dir)
        except Exception as e:
            logger.warning(f"Could not remove temporary directory {temp_uploads_dir}: {str(e)}")

        return processed_documents

    except Exception as e:
        logger.error(f"Error processing temporary documents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing temporary documents: {str(e)}",
        )
