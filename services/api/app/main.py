"""FastAPI app. Sprint 0: health and version. Auth, families and sync arrive in Sprint 2."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import __version__
from .db import get_session
from .settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Trailbuddies API",
        version=__version__,
        docs_url="/docs" if settings.env != "production" else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    def health(session: Session = Depends(get_session)) -> dict:
        """Liveness plus a database check. Never returns personal data."""
        try:
            session.execute(text("SELECT 1"))
            database = "ok"
        except Exception:  # noqa: BLE001 - report, don't crash the probe
            database = "unavailable"
        return {
            "status": "ok" if database == "ok" else "degraded",
            "version": __version__,
            "database": database,
        }

    @app.get("/version")
    def version() -> dict:
        return {"version": __version__, "env": settings.env}

    return app


app = create_app()
