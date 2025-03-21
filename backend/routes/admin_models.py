"""
Admin routes for Model Management in PeerAI API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models.models import AIModel, ModelProvider
from backend.core.security import get_current_user
from backend.core.roles import Role, has_permission, Permission
from backend.models.auth import User
from backend.schemas.admin_models import AIModelCreate, AIModelUpdate, AIModelResponse, ModelProviderResponse

router = APIRouter(prefix="/models", tags=["Admin - Models"])

def super_admin_check(current_user: User):
    """Utility to verify the user has system configuration permission."""
    if not has_permission(current_user.role, Permission.SYSTEM_CONFIGURATION):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only users with system configuration permission can manage models."
        )

@router.get("/", response_model=List[AIModelResponse])
async def list_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all models in the registry."""
    super_admin_check(current_user)
    return db.query(AIModel).all()

@router.get("/providers", response_model=List[ModelProviderResponse])
async def list_providers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all model providers."""
    super_admin_check(current_user)
    return db.query(ModelProvider).all()

@router.get("/{model_id}", response_model=AIModelResponse)
async def get_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific model by ID."""
    super_admin_check(current_user)
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")
    return model

@router.post("/", response_model=AIModelResponse)
async def create_model(payload: AIModelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new model in the registry."""
    super_admin_check(current_user)

    # Verify provider exists
    provider = db.query(ModelProvider).filter(ModelProvider.id == payload.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail="Invalid provider_id.")

    model = AIModel(
        name=payload.name,
        display_name=payload.display_name,
        provider_id=payload.provider_id,
        model_type=payload.model_type,
        capabilities=payload.capabilities,
        context_window=payload.context_window,
        status=payload.status,
        is_default=payload.is_default,
        cost_per_1k_input_tokens=payload.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens=payload.cost_per_1k_output_tokens,
        config=payload.config,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model

@router.put("/{model_id}", response_model=AIModelResponse)
async def update_model(model_id: int, payload: AIModelUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing model in the registry."""
    super_admin_check(current_user)
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")

    # Update fields if provided in payload
    if payload.name is not None:
        model.name = payload.name
    if payload.display_name is not None:
        model.display_name = payload.display_name
    if payload.provider_id is not None:
        # Verify provider exists
        provider = db.query(ModelProvider).filter(ModelProvider.id == payload.provider_id).first()
        if not provider:
            raise HTTPException(status_code=400, detail="Invalid provider_id.")
        model.provider_id = payload.provider_id
    if payload.model_type is not None:
        model.model_type = payload.model_type
    if payload.capabilities is not None:
        model.capabilities = payload.capabilities
    if payload.context_window is not None:
        model.context_window = payload.context_window
    if payload.status is not None:
        model.status = payload.status
    if payload.is_default is not None:
        model.is_default = payload.is_default
    if payload.cost_per_1k_input_tokens is not None:
        model.cost_per_1k_input_tokens = payload.cost_per_1k_input_tokens
    if payload.cost_per_1k_output_tokens is not None:
        model.cost_per_1k_output_tokens = payload.cost_per_1k_output_tokens
    if payload.config is not None:
        model.config = payload.config

    db.commit()
    db.refresh(model)
    return model

@router.delete("/{model_id}")
async def delete_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a model from the registry."""
    super_admin_check(current_user)
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")

    db.delete(model)
    db.commit()
    return {"detail": "Model deleted successfully."} 