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
        When you sign up using their referral code, you'll both receive 10,000 tokens as a welcome bonus!

        To get started:
        1. Visit https://app.peerdigital.se/signup
        2. Enter the referral code: {referral_code}
        3. Create your account
        4. Start using our powerful AI models!

        Best regards,
        The Peer AI Team
        """
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{referrer_name} invited you to join Peer AI!</h2>
            <p><strong>{referrer_name}</strong> has invited you to join Peer AI, a powerful AI platform for developers and businesses.</p>
            <p>When you sign up using their referral code, you'll both receive <strong>10,000 tokens</strong> as a welcome bonus!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your Referral Code:</strong></p>
                <p style="font-family: monospace; font-size: 1.2em; margin: 10px 0;">{referral_code}</p>
            </div>

            <p><strong>To get started:</strong></p>
            <ol>
                <li>Visit <a href="https://app.peerdigital.se/signup">https://app.peerdigital.se/signup</a></li>
                <li>Enter the referral code above</li>
                <li>Create your account</li>
                <li>Start using our powerful AI models!</li>
            </ol>

            <p style="color: #666;">Best regards,<br>The Peer AI Team</p>
        </div>
        """
        return cls.send_email(referee_email, subject, body, html) 