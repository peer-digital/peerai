"""
Routes for app templates.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models.app_templates import AppTemplate
from backend.models.auth import User
from backend.schemas.app_templates import (
    AppTemplateCreate,
    AppTemplateUpdate,
    AppTemplateResponse,
)
from backend.core.security import get_current_user
from backend.core.roles import Permission, has_permission

router = APIRouter(prefix="/app-templates", tags=["app-templates"])

# Add a route handler for the root path without trailing slash to avoid redirects
@router.get("", include_in_schema=False)
async def list_templates_no_slash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Handle requests to the root path without trailing slash."""
    # Just call the main handler
    return await list_templates(db=db, current_user=current_user)


def super_admin_check(current_user: User):
    """Check if the user is a super admin."""
    print(f"Checking permissions for user {current_user.email} with role {current_user.role}")
    print(f"User has SYSTEM_CONFIGURATION permission: {has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION)}")
    print(f"User has MANAGE_APP_STORE permission: {has_permission(current_user.role, Permission.MANAGE_APP_STORE)}")

    # Allow users with either SYSTEM_CONFIGURATION or MANAGE_APP_STORE permission
    if not (has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION) or
            has_permission(current_user.role, Permission.MANAGE_APP_STORE)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage app templates.",
        )


@router.get("/", response_model=List[AppTemplateResponse])
async def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Debug information
    print(f"User authenticated: {current_user.email if current_user else 'No user'}")
    print(f"User role: {current_user.role}")
    print(f"User has MANAGE_APP_STORE permission: {has_permission(current_user.role, Permission.MANAGE_APP_STORE)}")
    """
    List all app templates.
    """
    # Regular users can only see active templates
    if not (has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION) or
            has_permission(current_user.role, Permission.MANAGE_APP_STORE)):
        return db.query(AppTemplate).filter(AppTemplate.is_active.is_(True)).all()

    # Super admins and users with MANAGE_APP_STORE permission can see all templates
    return db.query(AppTemplate).all()


# Add handlers for both with and without trailing slash
@router.get("/{slug}", response_model=AppTemplateResponse)
@router.get("/{slug}/", response_model=AppTemplateResponse, include_in_schema=False)
async def get_template(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a single app template by its slug.
    """
    template_obj = db.query(AppTemplate).filter(AppTemplate.slug == slug).first()

    if not template_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Regular users can only see active templates
    if not (has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION) or
            has_permission(current_user.role, Permission.MANAGE_APP_STORE)) and not template_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return template_obj


# Add handlers for both with and without trailing slash
@router.post("/", response_model=AppTemplateResponse)
@router.post("", response_model=AppTemplateResponse, include_in_schema=False)
async def create_template(
    payload: AppTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new app template (super admin only).
    """
    super_admin_check(current_user)

    try:
        template_obj = AppTemplate(**payload.model_dump())
        db.add(template_obj)
        db.commit()
        db.refresh(template_obj)
        return template_obj
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A template with this slug already exists",
        )


# Add handlers for both with and without trailing slash
@router.put("/{slug}", response_model=AppTemplateResponse)
@router.put("/{slug}/", response_model=AppTemplateResponse, include_in_schema=False)
async def update_template(
    slug: str,
    payload: AppTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing app template (super admin only).
    """
    super_admin_check(current_user)

    template_obj = db.query(AppTemplate).filter(AppTemplate.slug == slug).first()
    if not template_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(template_obj, field, value)

    db.commit()
    db.refresh(template_obj)
    return template_obj


# Add handlers for both with and without trailing slash
@router.delete("/{slug}")
@router.delete("/{slug}/", include_in_schema=False)
async def delete_template(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an app template (super admin only).
    """
    super_admin_check(current_user)

    template_obj = db.query(AppTemplate).filter(AppTemplate.slug == slug).first()
    if not template_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check if there are any deployed apps using this template
    if template_obj.deployments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete template with active deployments",
        )

    db.delete(template_obj)
    db.commit()

    return {"detail": "Template deleted successfully"}
