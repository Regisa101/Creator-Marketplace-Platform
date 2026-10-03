"""Outgoing email for CreatorHub (SMTP, standard library only).

Design rules:
  * Credentials come only from environment variables (see core/config.py).
  * Sending is best-effort: ``send_creator_selected_email`` NEVER raises, so
    an email outage can never break or undo a creator selection.
  * Every outcome (sent / skipped / failed) is logged.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

from app.core import config

logger = logging.getLogger(__name__)

BRAND_NAME = "CreatorHub"
SMTP_TIMEOUT_SECONDS = 15


def is_email_configured() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_FROM_EMAIL)


def _one_line(value: str) -> str:
    """Strip CR/LF so user-controlled text can never inject email headers."""
    return " ".join(str(value or "").split())


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str) -> None:
    """Send one multipart (text + HTML) email. Raises on any failure."""
    if not is_email_configured():
        raise RuntimeError("SMTP is not configured (SMTP_HOST / SMTP_FROM_EMAIL missing).")

    msg = EmailMessage()
    msg["Subject"] = _one_line(subject)
    msg["From"] = formataddr((BRAND_NAME, config.SMTP_FROM_EMAIL))
    msg["To"] = _one_line(to_email)
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    context = ssl.create_default_context()
    if config.SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS, context=context)
    else:
        server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS)

    with server:
        if config.SMTP_PORT != 465:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
        if config.SMTP_USERNAME and config.SMTP_PASSWORD:
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
        server.send_message(msg)


def build_creator_selected_email(
    *, creator_name: str, campaign_title: str, business_name: str, campaign_url: str
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the "you were selected" email."""
    subject = f"You've been selected for {campaign_title}"

    text_body = (
        f"Hi {creator_name},\n\n"
        f"Congratulations! 🎉\n\n"
        f"You have been selected by {business_name} for the campaign “{campaign_title}”.\n\n"
        f"Next steps: log in to {BRAND_NAME} to view the campaign details, review your "
        f"contract, and get started with {business_name}.\n\n"
        f"View your contract: {campaign_url}\n\n"
        f"Thank you,\n{BRAND_NAME} Team\n"
    )

    name, title, biz, url = (escape(creator_name), escape(campaign_title), escape(business_name), escape(campaign_url, quote=True))
    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:20px 32px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">{BRAND_NAME}</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">Hi {name},</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">Congratulations! 🎉</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  You have been selected by <strong>{biz}</strong> for the campaign
                  “<strong>{title}</strong>”.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  <strong>What's next?</strong> Log in to {BRAND_NAME} to view the campaign
                  details, review your contract, and continue with the next steps.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="{url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;">View Contract</a>
                </p>
                <p style="margin:0;font-size:16px;line-height:1.6;">Thank you,<br>{BRAND_NAME} Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafa;color:#71717a;font-size:12px;line-height:1.5;">
                You received this email because you applied to a campaign on {BRAND_NAME}.
                If the button doesn't work, copy this link into your browser:<br>
                <span style="word-break:break-all;">{url}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return subject, text_body, html_body


def send_creator_selected_email(
    *,
    to_email: str,
    creator_name: str,
    campaign_title: str,
    business_name: str,
    campaign_url: str,
    application_id: int | None = None,
) -> bool:
    """Email a creator that a business selected them. Never raises.

    Returns True if the email was handed to the SMTP server, else False.
    """
    ref = f"application={application_id} to={to_email!r}"
    try:
        if not to_email:
            logger.warning("Selection email skipped (creator has no email): %s", ref)
            return False
        if not is_email_configured():
            logger.warning("Selection email skipped (SMTP not configured): %s", ref)
            return False

        subject, text_body, html_body = build_creator_selected_email(
            creator_name=creator_name,
            campaign_title=campaign_title,
            business_name=business_name,
            campaign_url=campaign_url,
        )
        send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
        logger.info("Selection email sent: %s", ref)
        return True
    except Exception:  # noqa: BLE001 - email must never break the selection flow
        logger.exception("Selection email FAILED (selection is unaffected): %s", ref)
        return False


# ----------------------------------------------------------------------
# Password reset email
# ----------------------------------------------------------------------
def build_password_reset_email(
    *, name: str, reset_url: str, expires_minutes: int
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the password reset email."""
    subject = f"Reset your {BRAND_NAME} password"

    text_body = (
        f"Hi {name},\n\n"
        f"We received a request to reset your {BRAND_NAME} password.\n\n"
        f"Choose a new password here (this link works once and expires in {expires_minutes} minutes):\n"
        f"{reset_url}\n\n"
        f"If you didn't ask for this, you can ignore this email. Your password won't change.\n\n"
        f"{BRAND_NAME} Team\n"
    )

    n, url = escape(name), escape(reset_url, quote=True)
    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:20px 32px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">{BRAND_NAME}</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">Hi {n},</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  We received a request to reset your {BRAND_NAME} password. This link works once
                  and expires in {expires_minutes} minutes.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="{url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;">Choose a new password</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">
                  If you didn't ask for this, you can ignore this email. Your password won't change.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafa;color:#71717a;font-size:12px;line-height:1.5;">
                If the button doesn't work, copy this link into your browser:<br>
                <span style="word-break:break-all;">{url}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return subject, text_body, html_body


def send_password_reset_email(*, to_email: str, name: str, reset_url: str, expires_minutes: int = 30) -> bool:
    """Email a password reset link. Never raises; returns True if handed to SMTP."""
    ref = f"to={to_email!r}"
    try:
        if not to_email:
            logger.warning("Password reset email skipped (no email): %s", ref)
            return False
        if not is_email_configured():
            logger.warning("Password reset email skipped (SMTP not configured): %s", ref)
            return False
        subject, text_body, html_body = build_password_reset_email(
            name=name, reset_url=reset_url, expires_minutes=expires_minutes
        )
        send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
        logger.info("Password reset email sent: %s", ref)
        return True
    except Exception:  # noqa: BLE001 - must never break the request
        logger.exception("Password reset email FAILED: %s", ref)
        return False