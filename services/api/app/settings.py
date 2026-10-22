"""Settings from environment variables (see .env.example at the repo root)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="TB_", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://trailbuddies:trailbuddies@localhost:5432/trailbuddies"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
