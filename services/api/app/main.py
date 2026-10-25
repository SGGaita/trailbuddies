"""FastAPI app: health, grown-up sign-in, families and learners, consent and progress sync."""

import logging

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import __version__
from .db import get_session
from .routes import auth, beta, content, families, lessons, media, members, ops, privacy, sync
from .scrub import scrub_sentry_event
from .settings import Settings, get_settings

log = logging.getLogger("trailbuddies")


class StripApiPrefix:
    """On Vercel the API is a service of the same project, reached at /api/* with the prefix
    still on the path (vercel.json rewrites). Locally the web app's proxy strips it. Either
    way the routes below see /families, /health and so on."""

    def __init__(self, app, prefix: str = "/api"):
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(self.prefix + "/"):
                scope = {**scope, "path": path[len(self.prefix) :] or "/", "root_path": self.prefix}
                raw = scope.get("raw_path")
                if raw:
                    scope["raw_path"] = raw[len(self.prefix) :] or b"/"
        await self.app(scope, receive, send)


def start_sentry(settings: Settings) -> None:
    """SAF-07: errors only. No PII, no request bodies, no performance tracing or profiling."""
    if settings.error_backend != "sentry" or not settings.sentry_dsn:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        release=settings.release or None,
        send_default_pii=False,
        max_request_body_size="never",
        include_local_variables=False,
        traces_sample_rate=0,
        before_send=scrub_sentry_event,
    )


def media_ready(settings: Settings) -> bool:
    """Serverless functions have no lasting disk: photos and clips must go to R2 there."""
    return not (settings.serverless and settings.media_backend != "s3")


def create_app() -> FastAPI:
    settings = get_settings()
    start_sentry(settings)
    if not media_ready(settings):
        log.error("TB_MEDIA_BACKEND must be s3 on Vercel: there is no lasting disk for photos and clips")
    app = FastAPI(
        title="Trailbuddies API",
        version=__version__,
        docs_url="/docs" if settings.env != "production" else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
        allow_credentials=True,
    )
    for r in (
        auth.router,
        families.router,
        members.router,
        sync.router,
        lessons.router,
        media.router,
        content.router,
        privacy.router,
        beta.router,
        ops.router,
    ):
        app.include_router(r)

    @app.get("/health")
    def health(response: Response, session: Session = Depends(get_session)) -> dict:
        """Liveness plus a database check, for uptime monitors (OPS-05): 503 when degraded, so
        Better Stack and UptimeRobot alert on it. Never returns personal data."""
        try:
            session.execute(text("SELECT 1"))
            database = "ok"
        except Exception:  # noqa: BLE001 - report, don't crash the probe
            database = "unavailable"
        media = "ok" if media_ready(settings) else "misconfigured"
        if database != "ok" or media != "ok":
            response.status_code = 503
        return {
            "status": "ok" if database == "ok" and media == "ok" else "degraded",
            "version": __version__,
            "database": database,
            "media": media,
        }

    @app.get("/version")
    def version() -> dict:
        return {"version": __version__, "env": settings.env}

    app.add_middleware(StripApiPrefix)
    return app


app = create_app()
