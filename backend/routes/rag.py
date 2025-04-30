"""
Routes for Retrieval Augmented Generation (RAG).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.auth import User, APIKey
from backend.models.rag import RAGIndex, Document, DocumentChunk
from backend.schemas.rag import (
    RAGIndexCreate,
    RAGIndexUpdate,
    RAGIndexResponse,
    DocumentResponse,
    SearchQuery,
    SearchResult,
)
from backend.services.rag_service import RAGService
from backend.core.security import get_current_user
from backend.routes.inference import get_api_key

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/indexes", response_model=RAGIndexResponse)
async def create_index(
    payload: RAGIndexCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new RAG index."""
    # Set the user_id if not provided
    if not payload.user_id and not payload.team_id and not payload.deployed_app_id:
        payload.user_id = current_user.id

    # Create the index
    rag_service = RAGService(db)
    index = await rag_service.create_index(
        name=payload.name,
        description=payload.description,
        user_id=payload.user_id,
        team_id=payload.team_id,
        deployed_app_id=payload.deployed_app_id,
        embedding_model=payload.embedding_model,
        chunk_size=payload.chunk_size,
        chunk_overlap=payload.chunk_overlap,
    )
    return index


@router.get("/indexes", response_model=List[RAGIndexResponse])
async def list_indexes(
    user_id: Optional[int] = None,
    team_id: Optional[int] = None,
    deployed_app_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List RAG indexes."""
    # Build the query
    query = db.query(RAGIndex).filter(RAGIndex.is_active.is_(True))

    # Filter by user_id, team_id, or deployed_app_id
    if user_id:
        query = query.filter(RAGIndex.user_id == user_id)
    if team_id:
        query = query.filter(RAGIndex.team_id == team_id)
    if deployed_app_id:
        query = query.filter(RAGIndex.deployed_app_id == deployed_app_id)

    # If no filters provided, show indexes for the current user or their team
    if not (user_id or team_id or deployed_app_id):
        query = query.filter(
            (RAGIndex.user_id == current_user.id)
            | (RAGIndex.team_id == current_user.team_id)
        )

    # Execute the query
    indexes = query.all()
    return indexes


@router.get("/indexes/{index_id}", response_model=RAGIndexResponse)
async def get_index(
    index_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a RAG index by ID."""
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")
    return index


@router.put("/indexes/{index_id}", response_model=RAGIndexResponse)
async def update_index(
    index_id: int,
    payload: RAGIndexUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a RAG index."""
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Update the index
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(index, key, value)

    db.commit()
    db.refresh(index)
    return index


@router.delete("/indexes/{index_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_index(
    index_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a RAG index."""
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Soft delete by setting is_active to False
    index.is_active = False
    db.commit()
    return None


@router.post("/indexes/{index_id}/documents", response_model=DocumentResponse)
async def upload_document(
    index_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document to a RAG index."""
    # Check if the index exists
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Upload the document
    rag_service = RAGService(db)
    try:
        document = await rag_service.upload_document(index_id, file)
        return document
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/app/{app_slug}/documents", response_model=DocumentResponse)
async def upload_document_for_app(
    app_slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document for a deployed app.

    This endpoint will:
    1. Find the deployed app by slug
    2. Check if the app has a RAG index associated with it
    3. If not, create a new RAG index for the app
    4. Upload the document to the RAG index
    5. Update the app configuration with the RAG index ID
    """
    from backend.models.deployed_apps import DeployedApp

    # Find the deployed app
    app = db.query(DeployedApp).filter(DeployedApp.slug == app_slug).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Get the app configuration
    config = app.configuration or {}

    # Check if the app has a RAG index associated with it
    rag_index_id = None
    if 'ai_settings' in config and 'rag_index_id' in config['ai_settings'] and config['ai_settings']['rag_index_id']:
        rag_index_id = config['ai_settings']['rag_index_id']

        # Verify that the index exists
        index = db.query(RAGIndex).filter(RAGIndex.id == rag_index_id).first()
        if not index:
            rag_index_id = None

    # Create a new RAG index if needed
    rag_service = RAGService(db)
    if not rag_index_id:
        # Create a new index for the app
        index = await rag_service.create_index(
            name=f"Index for {app.name}",
            description=f"RAG index for the app {app.name}",
            deployed_app_id=app.id,
            embedding_model="mistral-embed",
        )
        rag_index_id = index.id

        # Update the app configuration with the RAG index ID
        if 'ai_settings' not in config:
            config['ai_settings'] = {}

        config['ai_settings']['rag_index_id'] = rag_index_id
        config['ai_settings']['enable_rag'] = True

        # Save the updated configuration
        app.configuration = config
        db.commit()

    # Upload the document
    try:
        document = await rag_service.upload_document(rag_index_id, file)
        return document
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/indexes/{index_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    index_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List documents in a RAG index."""
    # Check if the index exists
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Get the documents
    documents = db.query(Document).filter(Document.index_id == index_id).all()
    return documents


@router.get("/admin/app/{app_slug}/documents", response_model=List[DocumentResponse])
async def list_documents_for_app(
    app_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List documents for a deployed app."""
    from backend.models.deployed_apps import DeployedApp

    # Find the deployed app
    app = db.query(DeployedApp).filter(DeployedApp.slug == app_slug).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Get the app configuration
    config = app.configuration or {}

    # Check if the app has a RAG index associated with it
    if 'ai_settings' not in config or 'rag_index_id' not in config['ai_settings'] or not config['ai_settings']['rag_index_id']:
        return []

    rag_index_id = config['ai_settings']['rag_index_id']

    # Verify that the index exists
    index = db.query(RAGIndex).filter(RAGIndex.id == rag_index_id).first()
    if not index:
        return []

    # Get the documents
    documents = db.query(Document).filter(Document.index_id == rag_index_id).all()
    return documents


@router.delete("/admin/app/{app_slug}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_for_app(
    app_slug: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document for a deployed app."""
    from backend.models.deployed_apps import DeployedApp

    # Find the deployed app
    app = db.query(DeployedApp).filter(DeployedApp.slug == app_slug).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Get the app configuration
    config = app.configuration or {}

    # Check if the app has a RAG index associated with it
    if 'ai_settings' not in config or 'rag_index_id' not in config['ai_settings'] or not config['ai_settings']['rag_index_id']:
        raise HTTPException(status_code=404, detail="App does not have a RAG index")

    rag_index_id = config['ai_settings']['rag_index_id']

    # Find the document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.index_id == rag_index_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete the document and its chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    db.delete(document)
    db.commit()

    return None


@router.post("/indexes/{index_id}/search", response_model=List[SearchResult])
async def search_index(
    index_id: int,
    query: SearchQuery,
    db: Session = Depends(get_db),
    api_key: APIKey = Depends(get_api_key),
):
    """Search a RAG index."""
    # Check if the index exists
    index = db.query(RAGIndex).filter(RAGIndex.id == index_id).first()
    if not index:
        raise HTTPException(status_code=404, detail="Index not found")

    # Search the index
    rag_service = RAGService(db)
    try:
        results = await rag_service.search(index_id, query.query, query.top_k)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
