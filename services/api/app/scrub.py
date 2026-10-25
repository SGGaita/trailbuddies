"""Scrubbing for error reports (SAF-07), mirrored in packages/domain/src/scrub.js. Error
reports must never carry a child's name, an email address or a link to a photo or clip."""

import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
URL = re.compile(r"\b(?:https?|blob|data):[^\s\"'<>)]+", re.I)
MEDIA = re.compile(
    r"/media/|/packs?/|r2\.|cloudflarestorage|amazonaws|blob:|data:|[?&](exp|sig|token|X-Amz)", re.I
)
SECRET = re.compile(r"\b(token|sig|signature|password|secret|key|code|pin)=([^&\s]+)", re.I)


def _url(m: re.Match) -> str:
    u = m.group(0)
    if MEDIA.search(u):
        return "[media-url]"
    return u.split("?")[0].split("#")[0]


def scrub_text(text: str | None, names: tuple[str, ...] | list[str] = (), limit: int = 4000) -> str:
    """Remove emails, media and signed links, secrets in query strings, and the given names."""
    if not text:
        return ""
    out = SECRET.sub(lambda m: f"{m.group(1)}=[hidden]", str(text))
    out = URL.sub(_url, out)
    out = EMAIL.sub("[email]", out)
    for n in sorted({n.strip() for n in names if n and len(n.strip()) > 1}, key=len, reverse=True):
        out = re.sub(rf"\b{re.escape(n)}\b", "[child]", out, flags=re.I)
    return out[:limit]


def scrub_sentry_event(event: dict, hint: dict | None = None) -> dict:
    """Sentry before_send: no request bodies, cookies, headers, query strings or users."""
    event.pop("user", None)
    req = event.get("request")
    if isinstance(req, dict):
        event["request"] = {"method": req.get("method"), "url": _url_only(req.get("url"))}
    for ex in (event.get("exception") or {}).get("values") or []:
        ex["value"] = scrub_text(ex.get("value"))
        for frame in (ex.get("stacktrace") or {}).get("frames") or []:
            frame.pop("vars", None)
    crumbs = event.get("breadcrumbs")
    if isinstance(crumbs, dict):
        for c in crumbs.get("values") or []:
            c["message"] = scrub_text(c.get("message"))
            c.pop("data", None)
    if event.get("message"):
        event["message"] = scrub_text(event["message"])
    event.pop("extra", None)
    return event


def _url_only(u: str | None) -> str:
    return scrub_text((u or "").split("?")[0])
