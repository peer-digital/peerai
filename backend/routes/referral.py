"""API routes for the referral system."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from database import get_db
from models.auth import User
from schemas.referral import Referral, ReferralCreate, ReferralStats
from services.referral import ReferralService
from core.security import get_current_user

router = APIRouter()


class ReferralInvitation(BaseModel):
    """Schema for referral invitation."""
    email: EmailStr


@router.post("/referrals", response_model=Referral)
async def create_referral(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new referral for the current user."""
    # Rate limiting: Check if user has created a referral in the last 24 hours
    recent_referral = db.query(Referral).filter(
        Referral.referrer_id == current_user.id,
        Referral.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).first()

    if recent_referral:
        raise HTTPException(
            status_code=429,
            detail="You can only create one referral every 24 hours"
        )

    return ReferralService.create_referral(db, current_user)


@router.post("/referrals/invite", response_model=bool)
async def send_referral_invitation(
    invitation: ReferralInvitation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a referral invitation email to a friend."""
    success = ReferralService.send_referral_invitation(
        db=db,
        referrer=current_user,
        referee_email=invitation.email
    )
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send referral invitation"
        )
    return success


@router.get("/referrals", response_model=list[Referral])
async def get_user_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all referrals created by the current user."""
    return ReferralService.get_user_referrals(db, current_user)


@router.get("/referrals/pending", response_model=Referral)
async def get_pending_referral(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the pending referral for the current user."""
    referral = ReferralService.get_pending_referral(db, current_user)
    if not referral:
        raise HTTPException(
            status_code=404,
            detail="No pending referral found"
        )
    return referral


@router.get("/referrals/stats", response_model=ReferralStats)
async def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get referral statistics for the current user."""
    return ReferralService.get_referral_stats(db, current_user)


@router.post("/referrals/use/{referral_code}", response_model=Referral)
async def use_referral_code(
    referral_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Use a referral code."""
    # Find the referral by code
    referral = db.query(Referral).filter(
        Referral.referral_code == referral_code,
        Referral.status == "pending"
    ).first()

    if not referral:
        raise HTTPException(
            status_code=404,
            detail="Invalid or expired referral code"
        )

    # Get the referrer
    referrer = db.query(User).filter(User.id == referral.referrer_id).first()
    if not referrer:
        raise HTTPException(
            status_code=404,
            detail="Referrer not found"
        )

    return ReferralService.use_referral(db, referrer, current_user) 