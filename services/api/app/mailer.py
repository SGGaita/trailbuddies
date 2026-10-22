"""Outgoing email over generic SMTP. Never logs addresses."""

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage

from .settings import get_settings

log = logging.getLogger("trailbuddies.mail")


def _send(to: str, subject: str, text: str, html: str) -> None:
    s = get_settings()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = s.smtp_from
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    try:
        if s.smtp_ssl:
            server = smtplib.SMTP_SSL(
                s.smtp_host, s.smtp_port, context=ssl.create_default_context(), timeout=15
            )
        else:
            server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15)
        with server:
            if s.smtp_starttls and not s.smtp_ssl:
                server.starttls(context=ssl.create_default_context())
            if s.smtp_user:
                server.login(s.smtp_user, s.smtp_password)
            server.send_message(msg)
    except (OSError, smtplib.SMTPException):
        log.exception("Sending an email failed")


def _unconfigured(link: str) -> bool:
    """True when SMTP isn't set up; in development the link goes to the log instead."""
    s = get_settings()
    if s.smtp_host:
        return False
    if s.env == "production":
        log.error("SMTP is not configured; an email could not be sent")
    else:
        log.warning("SMTP not configured (development). Link: %s", link)
    return True


def _button(link: str, label: str) -> str:
    return (
        f'<p><a href="{link}" style="background:#1f5b3a;color:#fff;padding:12px 20px;border-radius:12px;'
        f'text-decoration:none;font-weight:bold">{label}</a></p>'
    )


def send_magic_link(to: str, link: str) -> None:
    if _unconfigured(link):
        return
    mins = get_settings().magic_link_minutes
    _send(
        to,
        "Your Trailbuddies sign-in link",
        "Hello!\n\nTap the link below to sign in to Trailbuddies. It works once and expires in "
        f"{mins} minutes.\n\n{link}\n\nIf you didn't ask for this, you can ignore this email.\n\n"
        "The Trailbuddies team",
        "<p>Hello!</p><p>Tap the button to sign in to Trailbuddies. It works once and expires in "
        f"{mins} minutes.</p>"
        + _button(link, "Sign in to Trailbuddies")
        + "<p>If you didn't ask for this, you can ignore this email.</p>",
    )


def send_invite(to: str, link: str, inviter: str, family: str, role: str) -> None:
    if _unconfigured(link):
        return
    what = "see and help with" if role == "parent" else "follow the progress of"
    h_inviter, h_family = html.escape(inviter), html.escape(family)
    days = get_settings().invite_days
    _send(
        to,
        f"{inviter} invited you to Trailbuddies",
        f"Hello!\n\n{inviter} invited you to {what} {family} on Trailbuddies, "
        "a learning app for children.\n\n"
        f"Accept here (valid for {days} days):\n{link}\n\nIf you weren't expecting this, you can ignore it.",
        f"<p>Hello!</p><p>{h_inviter} invited you to {what} <b>{h_family}</b> on Trailbuddies, "
        "a learning app for children.</p>"
        + _button(link, "Accept the invitation")
        + f"<p>The link works for {days} days.</p>",
    )
