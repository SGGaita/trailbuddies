"""Outgoing email over generic SMTP. Never logs addresses."""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from .settings import get_settings

log = logging.getLogger("trailbuddies.mail")


def send_magic_link(to: str, link: str) -> None:
    s = get_settings()
    if not s.smtp_host:
        if s.env == "production":
            log.error("SMTP is not configured; a sign-in email could not be sent")
            return
        log.warning("SMTP not configured (development). Sign-in link: %s", link)
        return
    msg = EmailMessage()
    msg["Subject"] = "Your Trailbuddies sign-in link"
    msg["From"] = s.smtp_from
    msg["To"] = to
    msg.set_content(
        "Hello!\n\nTap the link below to sign in to Trailbuddies. It works once and "
        f"expires in {s.magic_link_minutes} minutes.\n\n{link}\n\n"
        "If you didn't ask for this, you can ignore this email.\n\nThe Trailbuddies team"
    )
    msg.add_alternative(
        f"""<p>Hello!</p><p>Tap the button to sign in to Trailbuddies. It works once and
expires in {s.magic_link_minutes} minutes.</p>
<p><a href="{link}" style="background:#1f5b3a;color:#fff;padding:12px 20px;border-radius:12px;
text-decoration:none;font-weight:bold">Sign in to Trailbuddies</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>""",
        subtype="html",
    )
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
        log.exception("Sending a sign-in email failed")
