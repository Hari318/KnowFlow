from __future__ import annotations

import resend

from app.core.config import settings

resend.api_key = settings.resend_api_key


def send_workspace_invite_email(
    to_email: str, workspace_name: str, inviter_name: str, token: str
) -> None:
    if not settings.resend_api_key:
        raise RuntimeError("Email sending is not configured (RESEND_API_KEY missing).")

    invite_url = f"{settings.frontend_url}/register?invite={token}"

    resend.Emails.send({
        "from": "KnowFlow <invites@knowflowapp.dev>",
        "to": [to_email],
        "subject": f"{inviter_name} invited you to '{workspace_name}' on KnowFlow",
        "html": f"""
            <p>{inviter_name} has invited you to collaborate on
            <strong>{workspace_name}</strong> in KnowFlow.</p>
            <p><a href="{invite_url}">Click here to accept and create your account</a></p>
            <p>If you already have a KnowFlow account, log in and the invite
            will be waiting for you.</p>
        """,
    })

def send_verification_email(to_email: str, token: str) -> None:
    if not settings.resend_api_key:
        raise RuntimeError("Email sending is not configured (RESEND_API_KEY missing).")

    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    resend.Emails.send({
        "from": "KnowFlow <verify@knowflowapp.dev>",
        "to": [to_email],
        "subject": "Verify your KnowFlow account",
        "html": f"""
                <p>Welcome to KnowFlow! Please verify your email address to activate your account.</p>
                <p><a href="{verify_url}">Click here to verify your email</a></p>
                <p>This link expires in 24 hours.</p>
            """,
    })

def send_password_reset_email(to_email: str, token: str) -> None:
    if not settings.resend_api_key:
        raise RuntimeError("Email sending is not configured (RESEND_API_KEY missing).")

    reset_url = f"{settings.frontend_url}/reset-password?token={token}"

    resend.Emails.send({
        "from": "KnowFlow <noreply@knowflowapp.dev>",
        "to": [to_email],
        "subject": "Reset your KnowFlow password",
        "html": f"""
            <p>We received a request to reset your KnowFlow password.</p>
            <p><a href="{reset_url}">Click here to choose a new password</a></p>
            <p>This link expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>
        """,
    })
