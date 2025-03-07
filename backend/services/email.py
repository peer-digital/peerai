"""Service for sending email notifications."""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from fastapi import HTTPException


class EmailService:
    """Service for sending email notifications."""

    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USERNAME = os.getenv("GMAIL_USERNAME")  # Your Google Workspace email
    SMTP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")  # App-specific password
    FROM_EMAIL = os.getenv("GMAIL_USERNAME", "noreply@peerai.com")
    BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")  # Default to localhost for development

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """Send an email to the specified recipient."""
        if not cls.SMTP_USERNAME or not cls.SMTP_PASSWORD:
            raise HTTPException(
                status_code=500,
                detail="Email service not configured. Please set GMAIL_USERNAME and GMAIL_APP_PASSWORD environment variables."
            )

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = cls.FROM_EMAIL
            msg["To"] = to_email

            # Add plain text body
            msg.attach(MIMEText(body, "plain"))

            # Add HTML body if provided
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            # Send email using Gmail SMTP
            with smtplib.SMTP(cls.SMTP_SERVER, cls.SMTP_PORT) as server:
                server.starttls()
                server.login(cls.SMTP_USERNAME, cls.SMTP_PASSWORD)
                server.send_message(msg)

            return True

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )

    @classmethod
    def send_referral_notification(
        cls,
        referrer_email: str,
        referee_email: str,
        tokens_earned: int
    ) -> bool:
        """Send notification emails to both referrer and referee."""
        # Send to referrer
        referrer_subject = "Your Peer AI Referral Was Used!"
        referrer_body = f"""
        Hi there!

        Great news! Your Peer AI referral was used by {referee_email}.
        You've earned {tokens_earned:,} tokens as a reward.

        Thanks for helping grow the Peer AI community!

        Best regards,
        The Peer AI Team
        """
        referrer_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Your Peer AI Referral Was Used!</h2>
            <p>Great news! Your Peer AI referral was used by <strong>{referee_email}</strong>.</p>
            <p>You've earned <strong>{tokens_earned:,}</strong> tokens as a reward.</p>
            <p>Thanks for helping grow the Peer AI community!</p>
            <p style="color: #666;">Best regards,<br>The Peer AI Team</p>
        </div>
        """
        cls.send_email(referrer_email, referrer_subject, referrer_body, referrer_html)

        # Send to referee
        referee_subject = "Welcome to Peer AI!"
        referee_body = f"""
        Hi there!

        Welcome to Peer AI! You've used a referral code and earned {tokens_earned:,} tokens.
        We're excited to have you join our community!

        Best regards,
        The Peer AI Team
        """
        referee_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Peer AI!</h2>
            <p>You've used a referral code and earned <strong>{tokens_earned:,}</strong> tokens.</p>
            <p>We're excited to have you join our community!</p>
            <p style="color: #666;">Best regards,<br>The Peer AI Team</p>
        </div>
        """
        cls.send_email(referee_email, referee_subject, referee_body, referee_html)

        return True

    @classmethod
    def send_referral_invitation(
        cls,
        referrer_email: str,
        referee_email: str,
        referral_code: str,
        referrer_name: str
    ) -> bool:
        """Send a referral invitation email."""
        subject = f"{referrer_name} invited you to join Peer AI!"
        body = f"""
        Hi there!

        {referrer_name} has invited you to join Peer AI, a powerful AI platform for developers and businesses.
        When you sign up using their referral link, you'll both receive 10,000 tokens as a welcome bonus!

        Click here to get started: {cls.BASE_URL}/login/{referral_code}

        Best regards,
        The Peer AI Team
        """
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{referrer_name} invited you to join Peer AI!</h2>
            <p><strong>{referrer_name}</strong> has invited you to join Peer AI, a powerful AI platform for developers and businesses.</p>
            <p>When you sign up using their referral link, you'll both receive <strong>10,000 tokens</strong> as a welcome bonus!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{cls.BASE_URL}/login/{referral_code}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Get Started
                </a>
            </div>

            <p style="color: #666;">Best regards,<br>The Peer AI Team</p>
        </div>
        """
        return cls.send_email(referee_email, subject, body, html)

    @classmethod
    def send_referral_admin_notification(
        cls,
        referrer_email: str,
        referee_email: str,
        tokens_earned: int
    ) -> bool:
        """Send notification email to admin about a successful referral."""
        admin_email = "info@peerdigital.se"
        subject = "New Peer AI Referral Completed"
        body = f"""
        A new referral has been completed:

        Referrer: {referrer_email}
        Referee: {referee_email}
        Tokens Awarded: {tokens_earned:,} (to each)

        This is an automated notification from the Peer AI referral system.
        """
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Peer AI Referral Completed</h2>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Referrer:</strong> {referrer_email}</p>
                <p><strong>Referee:</strong> {referee_email}</p>
                <p><strong>Tokens Awarded:</strong> {tokens_earned:,} (to each)</p>
            </div>
            <p style="color: #666;">This is an automated notification from the Peer AI referral system.</p>
        </div>
        """
        return cls.send_email(admin_email, subject, body, html) 