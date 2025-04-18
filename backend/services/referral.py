"""Service for handling user referrals."""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
import secrets
import string

from models.auth import User
from models.referral import Referral
from services.email import EmailService


class ReferralService:
    """Service for managing user referrals."""

    REFERRAL_BONUS_TOKENS = 10000  # Number of tokens given to both referrer and referee
    MAX_REFERRALS_PER_DAY = 2  # Maximum number of times a referral code can be used per day

    @staticmethod
    def get_referral_code(referrer_id: int) -> str:
        """Get a referral code for a user based on their ID."""
        # Convert the user ID to base36 (using digits 0-9 and letters a-z)
        # This gives us a shorter, more readable code
        alphabet = string.digits + string.ascii_lowercase
        code = ''
        while referrer_id:
            referrer_id, i = divmod(referrer_id, 36)
            code = alphabet[i] + code
        # Pad with zeros to ensure consistent length
        return code.zfill(4).upper()

    @staticmethod
    def create_referral(db: Session, referrer: User) -> Referral:
        """Create a new referral for a user."""
        # Check if user already has a pending referral
        existing_referral = db.query(Referral).filter(
            Referral.referrer_id == referrer.id,
            Referral.status == "pending"
        ).first()

        if existing_referral:
            return existing_referral

        # Create a new referral with a temporary referee_id (using referrer's ID as placeholder)
        referral = Referral(
            referrer_id=referrer.id,
            referee_id=referrer.id,  # Temporary referee_id, will be updated when used
            status="pending"
        )
        db.add(referral)
        db.commit()
        db.refresh(referral)
        return referral

    @staticmethod
    def use_referral(db: Session, referrer: User, referee: User) -> Referral:
        """Use a referral and award bonus tokens to both users."""
        # Validate that referee is not the same as referrer
        if referrer.id == referee.id:
            raise HTTPException(
                status_code=400,
                detail="Cannot use your own referral code"
            )

        # Check daily usage limit for the referral code
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_usage = db.query(Referral).filter(
            Referral.referrer_id == referrer.id,
            Referral.status == "completed",
            Referral.completed_at >= today_start
        ).count()

        if daily_usage >= ReferralService.MAX_REFERRALS_PER_DAY:
            raise HTTPException(
                status_code=429,
                detail=f"This referral code has reached the maximum usage limit of {ReferralService.MAX_REFERRALS_PER_DAY} times per day"
            )

        # Find a pending referral from the referrer
        referral = db.query(Referral).filter(
            Referral.referrer_id == referrer.id,
            Referral.status == "pending"
        ).first()

        if not referral:
            raise HTTPException(
                status_code=404,
                detail="No pending referral found"
            )

        # Update referral status
        referral.status = "completed"
        referral.completed_at = datetime.utcnow()
        referral.referee_id = referee.id  # Update with actual referee_id

        # Award bonus tokens to both users
        referrer.token_limit += ReferralService.REFERRAL_BONUS_TOKENS
        referee.token_limit += ReferralService.REFERRAL_BONUS_TOKENS

        db.commit()
        db.refresh(referral)

        # Send email notifications
        try:
            EmailService.send_referral_notification(
                referrer_email=referrer.email,
                referee_email=referee.email,
                tokens_earned=ReferralService.REFERRAL_BONUS_TOKENS
            )
            # Send admin notification
            EmailService.send_referral_admin_notification(
                referrer_email=referrer.email,
                referee_email=referee.email,
                tokens_earned=ReferralService.REFERRAL_BONUS_TOKENS
            )
        except Exception as e:
            # Log the error but don't fail the referral process
            print(f"Failed to send referral notification emails: {str(e)}")

        return referral

    @staticmethod
    def get_user_referrals(db: Session, user: User) -> list[Referral]:
        """Get all referrals created by a user."""
        return db.query(Referral).filter(Referral.referrer_id == user.id).all()

    @staticmethod
    def get_pending_referral(db: Session, user: User) -> Optional[Referral]:
        """Get the pending referral for a user."""
        return db.query(Referral).filter(
            Referral.referrer_id == user.id,
            Referral.status == "pending"
        ).first()

    @staticmethod
    def get_referral_stats(db: Session, user: User) -> dict:
        """Get referral statistics for a user."""
        referrals = ReferralService.get_user_referrals(db, user)
        
        # Get the current referral code
        referral_code = ReferralService.get_referral_code(user.id)

        # Calculate statistics
        total_referrals = len(referrals)
        successful_referrals = len([r for r in referrals if r.status == "completed"])
        pending_referrals = len([r for r in referrals if r.status == "pending"])
        total_tokens_earned = successful_referrals * ReferralService.REFERRAL_BONUS_TOKENS

        return {
            "total_referrals": total_referrals,
            "successful_referrals": successful_referrals,
            "pending_referrals": pending_referrals,
            "total_tokens_earned": total_tokens_earned,
            "referral_code": referral_code
        } 