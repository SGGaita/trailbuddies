from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command

API = Path(__file__).resolve().parents[1]


def alembic_config(url: str) -> Config:
    cfg = Config(str(API / "alembic.ini"))
    cfg.set_main_option("script_location", str(API / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_upgrade_creates_tables_and_downgrade_removes_them(tmp_path):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    cfg = alembic_config(url)
    command.upgrade(cfg, "head")
    tables = set(inspect(create_engine(url)).get_table_names())
    assert {
        "users",
        "families",
        "family_members",
        "learners",
        "consents",
        "sessions",
        "login_tokens",
        "events",
    } <= tables
    learner_cols = {c["name"] for c in inspect(create_engine(url)).get_columns("learners")}
    # Data minimisation: no surname, email, photo or location for children.
    assert learner_cols == {
        "id",
        "family_id",
        "name",
        "birth_year",
        "birth_month",
        "avatar_color",
        "buddy",
        "outfit",
        "interests",
        "placement",
        "difficulty",
        "wish",
        "created_at",
        "updated_at",
    }
    command.downgrade(cfg, "base")
    assert set(inspect(create_engine(url)).get_table_names()) <= {"alembic_version"}


def test_models_match_migrations(tmp_path):
    """Fails if a model changed without a new migration."""
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    from app import models  # noqa: F401
    from app.db import Base

    url = f"sqlite:///{tmp_path / 'd.db'}"
    command.upgrade(alembic_config(url), "head")
    with create_engine(url).connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == []
