"""Service for sending email notifications."""

from google.oauth2 import service_account
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import json
import os
from typing import Optional
from fastapi import HTTPException


class EmailService:
    """Service for sending email notifications."""

    # Gmail API configuration
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose'
    ]
    FROM_EMAIL = os.getenv("NOTIFICATION_EMAIL_ALIAS", "notifications@peerdigital.se")
    BASE_URL = os.getenv("FE_URL", "http://localhost:3000")  # Default to localhost for development

    @classmethod
    def _get_gmail_service(cls):
        """Get authenticated Gmail service."""
        try:
            # Get and decode service account credentials
            creds_base64 = os.getenv('GOOGLE_SERVICE_ACCOUNT_CREDS')
            if not creds_base64:
                raise ValueError("GOOGLE_SERVICE_ACCOUNT_CREDS environment variable not set")

            # Decode base64 to JSON string
            creds_json = base64.b64decode(creds_base64).decode('utf-8')

            # Create a temporary file with the credentials
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_file:
                temp_file.write(creds_json)
                temp_path = temp_file.name

            try:
                credentials = service_account.Credentials.from_service_account_file(
                    temp_path,
                    scopes=cls.SCOPES,
                    subject=os.getenv('GOOGLE_WORKSPACE_ADMIN_EMAIL', 'adam.falkenberg@peerdigital.se')
                )
                return build('gmail', 'v1', credentials=credentials)
            finally:
                # Clean up the temporary file
                os.unlink(temp_path)

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize Gmail service: {str(e)}"
            )

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """Send an email to the specified recipient."""
        try:
            service = cls._get_gmail_service()

            # Create message
            message = MIMEMultipart('alternative')
            message['to'] = to_email
            message['from'] = f"Peer AI <{cls.FROM_EMAIL}>"
            message['subject'] = subject

            # Add plain text body
            message.attach(MIMEText(body, 'plain'))

            # Add HTML body if provided
            if html_body:
                message.attach(MIMEText(html_body, 'html'))

            # Encode the message for Gmail API
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

            # Send the email
            service.users().messages().send(
                userId='me',
                body={'raw': raw}
            ).execute()

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

        Click here to get started: {cls.BASE_URL}/register/{referral_code}

        Best regards,
        The Peer AI Team
        """
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{referrer_name} invited you to join Peer AI!</h2>
            <p><strong>{referrer_name}</strong> has invited you to join Peer AI, a powerful AI platform for developers and businesses.</p>
            <p>When you sign up using their referral link, you'll both receive <strong>10,000 tokens</strong> as a welcome bonus!</p>

            <div style="text-align: left; margin: 30px 0;">
                <a href="{cls.BASE_URL}/register/{referral_code}"
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