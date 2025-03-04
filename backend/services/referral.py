"""Service for handling user referrals."""

from datetime import datetime
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
    REFERRAL_CODE_LENGTH = 8  # Length of the referral code

    @staticmethod
    def generate_referral_code() -> str:
        """Generate a unique referral code."""
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(ReferralService.REFERRAL_CODE_LENGTH))

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

        # Generate a unique referral code
        referral_code = ReferralService.generate_referral_code()
        while db.query(Referral).filter(Referral.referral_code == referral_code).first():
            referral_code = ReferralService.generate_referral_code()

        referral = Referral(
            referrer_id=referrer.id,
            status="pending",
            referral_code=referral_code
        )
        db.add(referral)
        db.commit()
        db.refresh(referral)
        return referral

    @staticmethod
    def send_referral_invitation(db: Session, referrer: User, referee_email: str) -> bool:
        """Send a referral invitation email to a friend."""
        # Get or create a referral code for the referrer
        referral = ReferralService.get_pending_referral(db, referrer)
        if not referral:
            referral = ReferralService.create_referral(db, referrer)

        # Send invitation email
        try:
            EmailService.send_referral_invitation(
                referrer_email=referrer.email,
                referee_email=referee_email,
                referral_code=referral.referral_code,
                referrer_name=referrer.full_name or referrer.email.split('@')[0]
            )
            return True
        except Exception as e:
            print(f"Failed to send referral invitation email: {str(e)}")
            return False

    @staticmethod
    def use_referral(db: Session, referrer: User, referee: User) -> Referral:
        """Use a referral and award bonus tokens to both users."""
        # Validate that referee is not the same as referrer
        if referrer.id == referee.id:
            raise HTTPException(
                status_code=400,
                detail="Cannot use your own referral code"
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
        referral.referee_id = referee.id

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
        pending_referral = ReferralService.get_pending_referral(db, user)
        referral_code = pending_referral.referral_code if pending_referral else None

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