"""Pydantic schemas for referral-related data."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReferralBase(BaseModel):
    """Base schema for referral data."""
    referrer_id: int
    referee_id: Optional[int] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class ReferralCreate(ReferralBase):
    """Schema for creating a new referral."""
    pass


class ReferralUpdate(ReferralBase):
    """Schema for updating a referral."""
    pass


class Referral(ReferralBase):
    """Schema for a referral."""
    id: int

    class Config:
        """Pydantic config."""
        from_attributes = True


class ReferralStats(BaseModel):
    """Schema for referral statistics."""
    total_referrals: int
    successful_referrals: int
    pending_referrals: int
    total_tokens_earned: int
    referral_code: str

    class Config:
        """Pydantic config."""
        from_attributes = True 