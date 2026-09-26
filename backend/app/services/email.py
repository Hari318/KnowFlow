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
        "from": "KnowFlow <onboarding@resend.dev>",
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