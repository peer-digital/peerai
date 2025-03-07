"""API routes for the referral system."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import string
from pydantic import BaseModel

from database import get_db
from models.auth import User
from models.referral import Referral
from schemas.referral import Referral as ReferralSchema, ReferralCreate, ReferralStats
from services.referral import ReferralService
from services.email import EmailService
from core.security import get_current_user

router = APIRouter()


class ReferralInvitation(BaseModel):
    referee_email: str
    referral_code: str
    referrer_name: str


@router.post("/referrals", response_model=ReferralSchema)
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


@router.get("/referrals", response_model=list[ReferralSchema])
async def get_user_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all referrals created by the current user."""
    return ReferralService.get_user_referrals(db, current_user)


@router.get("/referrals/pending", response_model=ReferralSchema)
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


@router.post("/referrals/use/{referral_code}", response_model=ReferralSchema)
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


@router.get("/referrals/validate/{referral_code}")
async def validate_referral_code(
    referral_code: str,
    db: Session = Depends(get_db)
) -> dict:
    """Validate a referral code."""
    try:
        # Convert the referral code back to user ID
        # The code is base36 (0-9 and a-z) and padded with zeros
        code = referral_code.lower().lstrip('0')  # Remove leading zeros
        if not code:  # If all zeros, use '0'
            code = '0'
            
        alphabet = string.digits + string.ascii_lowercase
        user_id = 0
        for char in code:
            user_id = user_id * 36 + alphabet.index(char)
        
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"valid": False, "message": "Invalid referral code"}
        
        # Check daily usage limit
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_usage = db.query(Referral).filter(
            Referral.referrer_id == user_id,
            Referral.status == "completed",
            Referral.completed_at >= today_start
        ).count()
        
        if daily_usage >= ReferralService.MAX_REFERRALS_PER_DAY:
            return {"valid": False, "message": "This referral code has reached its daily limit"}
        
        return {"valid": True, "message": "Valid referral code"}
    except Exception as e:
        print(f"Error validating referral code: {str(e)}")  # Add logging
        return {"valid": False, "message": "Invalid referral code"}


@router.post("/referrals/send-invitation")
async def send_referral_invitation(
    invitation: ReferralInvitation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a referral invitation email."""
    # Validate the referral code
    validation = await validate_referral_code(invitation.referral_code, db)
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail=validation["message"]
        )

    # Send the invitation email
    try:
        EmailService.send_referral_invitation(
            referrer_email=current_user.email,
            referee_email=invitation.referee_email,
            referral_code=invitation.referral_code,
            referrer_name=invitation.referrer_name
        )
        return {"message": "Invitation sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send invitation email: {str(e)}"
        ) 