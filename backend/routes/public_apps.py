"""
Public routes for accessing deployed AI apps.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse

from backend.database import get_db
from backend.models.deployed_apps import DeployedApp
from backend.models.app_templates import AppTemplate

router = APIRouter(prefix="/public-apps", tags=["public-apps"])


@router.get("/{slug}", response_class=HTMLResponse)
async def get_public_app(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get a deployed app by its slug for public access.
    Returns the rendered HTML of the app.
    """
    # Find the deployed app
    deployed_app = db.query(DeployedApp).filter(
        DeployedApp.slug == slug,
        DeployedApp.is_active.is_(True)
    ).first()

    if not deployed_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Get the template
    template = db.query(AppTemplate).filter(AppTemplate.id == deployed_app.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Use the custom code if available, otherwise use the template code
    html_content = deployed_app.custom_code or template.template_code

    # Replace configuration placeholders in the HTML
    if deployed_app.configuration:
        for key, value in deployed_app.configuration.items():
            placeholder = f"{{{{{key}}}}}"
            html_content = html_content.replace(placeholder, str(value))

    # Add the server's base URL as a meta tag to help client-side scripts
    # determine the correct API endpoint
    from backend.config import settings
    server_url = settings.FE_URL.rstrip('/')
    meta_tag = f'<meta name="server-url" content="{server_url}" />'
    html_content = html_content.replace('</head>', f'{meta_tag}\n</head>')

    return html_content


@router.get("/{slug}/config")
async def get_public_app_config(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get the configuration of a deployed app by its slug for public access.
    This endpoint is useful for client-side rendering of the app.
    """
    # Find the deployed app
    deployed_app = db.query(DeployedApp).filter(
        DeployedApp.slug == slug,
        DeployedApp.is_active.is_(True)
    ).first()

    if not deployed_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    # Get the template
    template = db.query(AppTemplate).filter(AppTemplate.id == deployed_app.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Return the app configuration
    return {
        "name": deployed_app.name,
        "slug": deployed_app.slug,
        "configuration": deployed_app.configuration or {},
        "template": {
            "name": template.name,
            "description": template.description,
            "template_code": deployed_app.custom_code or template.template_code,
        }
    }
