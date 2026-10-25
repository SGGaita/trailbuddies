import os
from logging.config import fileConfig

from alembic import context
from app import models  # noqa: F401  (registers tables)
from app.db import Base, create_db_engine
from app.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
if not config.get_main_option("sqlalchemy.url"):
    # Migrations use a direct or session-mode connection where there is one (Supabase port
    # 5432); the app itself uses the transaction pooler (port 6543). See docs/vercel-supabase.md.
    url = os.environ.get("TB_MIGRATE_DATABASE_URL") or get_settings().database_url
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_db_engine(config.get_main_option("sqlalchemy.url"), serverless=True)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
