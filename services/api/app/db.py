"""Database engine, session and the declarative base."""

from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import NullPool

from .settings import get_settings


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(UTC)


class Timestamped:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


_engine = None
_session_factory = None


def pooled(url: str) -> bool:
    """A connection pooler in transaction mode (Supabase's port 6543, or PgBouncer)."""
    return ":6543/" in url or "pgbouncer=true" in url


def engine_options(url: str, serverless: bool = False) -> dict:
    """Behind a transaction pooler the pooler does the pooling: no client pool and no prepared
    statements (they don't survive a connection being handed to someone else). Serverless
    functions also drop their pool, so a frozen function never holds a connection."""
    opts: dict = {"pool_pre_ping": True}
    if pooled(url) or serverless:
        opts = {"poolclass": NullPool}
    if pooled(url):
        opts["connect_args"] = {"prepare_threshold": None}
    return opts


def create_db_engine(url: str, serverless: bool = False):
    opts = engine_options(url, serverless)
    # "pgbouncer=true" is only our marker (Prisma-style); psycopg doesn't know it.
    url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
    return create_engine(url, **opts)


def get_engine():
    global _engine, _session_factory
    if _engine is None:
        s = get_settings()
        _engine = create_db_engine(s.database_url, s.serverless)
        _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    get_engine()
    with _session_factory() as session:
        yield session
