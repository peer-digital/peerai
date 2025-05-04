"""
Routes for deployed AI apps.
"""
from typing import List, Optional
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models.deployed_apps import DeployedApp
from backend.models.app_templates import AppTemplate
from backend.models.auth import User, Team
from backend.models.documents import Document, DocumentChunk, AppDocument
from backend.schemas.deployed_apps import (
    DeployedAppCreate,
    DeployedAppUpdate,
    DeployedAppResponse,
    DeployedAppDetailResponse,
)
from backend.core.security import get_current_user
from backend.core.roles import Permission, has_permission

router = APIRouter(prefix="/deployed-apps", tags=["deployed-apps"])


# Add a route handler for the root path without trailing slash to avoid redirects
@router.get("", include_in_schema=False)
async def list_deployed_apps_no_slash(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Redirect to the route with trailing slash."""
    # Just call the main handler
    return await list_deployed_apps(team_id=team_id, db=db, current_user=current_user)


def check_deploy_permission(current_user: User):
    """Check if the user has permission to deploy apps."""
    if not has_permission(current_user.role, Permission.DEPLOY_APPS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to deploy apps.",
        )


def check_configure_permission(current_user: User):
    """Check if the user has permission to configure apps."""
    if not has_permission(current_user.role, Permission.CONFIGURE_APPS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to configure apps.",
        )


@router.get("/", response_model=List[DeployedAppResponse])
async def list_deployed_apps(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all deployed apps for the user's team or organization.
    """
    query = db.query(DeployedApp)

    # Filter by team if specified
    if team_id:
        query = query.filter(DeployedApp.team_id == team_id)

    # For regular users, only show apps deployed to their team
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        if current_user.team_id:
            query = query.filter(
                (DeployedApp.team_id == current_user.team_id) |
                (DeployedApp.team_id.is_(None))  # Include organization-wide deployments
            )
        else:
            # If user has no team, only show organization-wide deployments
            query = query.filter(DeployedApp.team_id.is_(None))

    return query.all()


@router.get("/{slug}", response_model=DeployedAppDetailResponse)
async def get_deployed_app(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a deployed app.
    """
    deployed_app = db.query(DeployedApp).filter(DeployedApp.slug == slug).first()

    if not deployed_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployed app not found",
        )

    # Check if user has access to this app
    if not has_permission(current_user.role, Permission.VIEW_ALL_USAGE):
        if deployed_app.team_id and deployed_app.team_id != current_user.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this deployed app",
            )

    # Get related data
    template = db.query(AppTemplate).filter(AppTemplate.id == deployed_app.template_id).first()
    deployed_by = db.query(User).filter(User.id == deployed_app.deployed_by_id).first()
    team = None
    if deployed_app.team_id:
        team = db.query(Team).filter(Team.id == deployed_app.team_id).first()

    # Create response with nested objects
    response_dict = {
        **deployed_app.__dict__,
        "template": template.__dict__ if template else None,
        "deployed_by": {
            "id": deployed_by.id,
            "email": deployed_by.email,
            "full_name": deployed_by.full_name,
        } if deployed_by else None,
        "team": team.__dict__ if team else None,
    }

    # Remove SQLAlchemy state
    if "_sa_instance_state" in response_dict:
        del response_dict["_sa_instance_state"]
    if response_dict["template"] and "_sa_instance_state" in response_dict["template"]:
        del response_dict["template"]["_sa_instance_state"]
    if response_dict["team"] and "_sa_instance_state" in response_dict["team"]:
        del response_dict["team"]["_sa_instance_state"]

    return response_dict


# Add a route handler for POST without trailing slash
@router.post("", response_model=DeployedAppResponse, include_in_schema=False)
async def deploy_app_no_slash(
    payload: DeployedAppCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deploy a new app (no trailing slash version)."""
    # Just call the main handler
    return await deploy_app(payload=payload, db=db, current_user=current_user)


@router.post("/", response_model=DeployedAppResponse)
async def deploy_app(
    payload: DeployedAppCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deploy a new app.
    """
    # Check if user has permission to deploy apps
    check_deploy_permission(current_user)

    # Check if the template exists
    template = db.query(AppTemplate).filter(AppTemplate.id == payload.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check if the template is active
    if not template.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deploy inactive template",
        )

    # Check if the team exists if team_id is provided
    if payload.team_id:
        team = db.query(Team).filter(Team.id == payload.team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )

        # Check if user is part of the team or has admin privileges
        if current_user.team_id != payload.team_id and not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to deploy apps to this team",
            )

    # Create the deployed app
    try:
        deployed_app = DeployedApp(
            **payload.model_dump(),
            deployed_by_id=current_user.id,
        )

        # Generate a public URL for the app
        if deployed_app.is_active and not deployed_app.public_url:
            from backend.config import settings
            base_url = settings.FE_URL.rstrip('/')
            deployed_app.public_url = f"{base_url}/apps/{deployed_app.slug}"

        db.add(deployed_app)
        db.commit()
        db.refresh(deployed_app)
        return deployed_app
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An app with this slug already exists",
        )


@router.put("/{slug}", response_model=DeployedAppResponse)
async def update_deployed_app(
    slug: str,
    payload: DeployedAppUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a deployed app.
    """
    # Check if user has permission to configure apps
    check_configure_permission(current_user)

    # Get the deployed app
    deployed_app = db.query(DeployedApp).filter(DeployedApp.slug == slug).first()
    if not deployed_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployed app not found",
        )

    # Check if user has access to this app
    if deployed_app.team_id and deployed_app.team_id != current_user.team_id and not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this deployed app",
        )

    # Update the deployed app
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(deployed_app, field, value)

    # If public_url is not set but is_active is True, generate a public URL
    if deployed_app.is_active and not deployed_app.public_url:
        # Generate a public URL based on the server's domain and the app's slug
        from backend.config import settings
        base_url = settings.FE_URL.rstrip('/')
        deployed_app.public_url = f"{base_url}/apps/{deployed_app.slug}"

    db.commit()
    db.refresh(deployed_app)
    return deployed_app


@router.delete("/{slug}")
async def delete_deployed_app(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a deployed app and all associated documents that are only used by this app.
    """
    # Check if user has permission to deploy apps (same permission needed to undeploy)
    check_deploy_permission(current_user)

    # Get the deployed app
    deployed_app = db.query(DeployedApp).filter(DeployedApp.slug == slug).first()
    if not deployed_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployed app not found",
        )

    # Check if user has access to this app
    if deployed_app.team_id and deployed_app.team_id != current_user.team_id and not has_permission(current_user.role, Permission.MANAGE_ALL_TEAMS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this deployed app",
        )

    # Set up logging
    logger = logging.getLogger(__name__)

    # Find all documents associated with this app
    app_documents = db.query(AppDocument).filter(AppDocument.app_id == deployed_app.id).all()

    # For each document, check if it's only used by this app
    documents_to_delete = []
    for app_doc in app_documents:
        # Count how many active app associations this document has
        association_count = db.query(AppDocument).filter(
            AppDocument.document_id == app_doc.document_id,
            AppDocument.is_active == True,
            AppDocument.app_id != deployed_app.id  # Exclude the current app
        ).count()

        # If this is the only app using this document, mark it for deletion
        if association_count == 0:
            documents_to_delete.append(app_doc.document_id)

    # Delete the documents that are only used by this app
    for doc_id in documents_to_delete:
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            # Try to delete the physical file if it exists and hasn't been processed yet
            if document.storage_path and not document.storage_path.startswith("PROCESSED_AND_DELETED:"):
                try:
                    if os.path.exists(document.storage_path):
                        os.remove(document.storage_path)
                        logger.info(f"Deleted file: {document.storage_path}")
                except Exception as e:
                    logger.error(f"Error deleting file {document.storage_path}: {str(e)}")

            # Delete all chunks associated with this document
            # (This is redundant due to cascade, but being explicit for clarity)
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()

            # Delete the document itself
            db.delete(document)
            logger.info(f"Deleted document: {document.filename} (ID: {doc_id})")

    # Delete the deployed app (this will cascade delete app_document associations)
    db.delete(deployed_app)
    db.commit()

    return {"detail": f"Deployed app deleted successfully along with {len(documents_to_delete)} associated documents"}
