"""
App Store routes for PeerAI API
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.ai_apps import AIApp
from backend.schemas.app_store import (
    AIAppCreate,
    AIAppUpdate,
    AIAppResponse,
)
from backend.core.security import get_current_user
from backend.core.roles import Permission, has_permission
from backend.models.auth import User

router = APIRouter(prefix="/app-store", tags=["app-store"])


def app_store_admin_check(current_user: User):
    if not has_permission(current_user.role, Permission.MANAGE_APP_STORE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage App Store configuration.",
        )


@router.get("/", response_model=List[AIAppResponse])
async def list_apps(db: Session = Depends(get_db)):
    """
    List all active AI apps in the store. This is a public endpoint.
    """
    return db.query(AIApp).filter(AIApp.is_active.is_(True)).all()


@router.get("/{slug}", response_model=AIAppResponse)
async def get_app(slug: str, db: Session = Depends(get_db)):
    """
    Get details of a single AI app by its slug. This is a public endpoint.
    """
    app_obj = (
        db.query(AIApp)
        .filter(AIApp.slug == slug, AIApp.is_active.is_(True))
        .first()
    )
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return app_obj


@router.post("/", response_model=AIAppResponse)
async def create_app(
    payload: AIAppCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new AI app entry (admin only).
    """
    app_store_admin_check(current_user)
    existing = db.query(AIApp).filter(AIApp.slug == payload.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An app with this slug already exists.",
        )
    app_obj = AIApp(**payload.model_dump())
    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)
    return app_obj


@router.put("/{slug}", response_model=AIAppResponse)
async def update_app(
    slug: str,
    payload: AIAppUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing AI app entry (admin only).
    """
    app_store_admin_check(current_user)
    app_obj = db.query(AIApp).filter(AIApp.slug == slug).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app_obj, field, value)
    db.commit()
    db.refresh(app_obj)
    return app_obj


@router.delete("/{slug}")
async def delete_app(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an AI app entry (admin only).
    """
    app_store_admin_check(current_user)
    app_obj = db.query(AIApp).filter(AIApp.slug == slug).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    db.delete(app_obj)
    db.commit()
    return {"detail": "App deleted successfully."}