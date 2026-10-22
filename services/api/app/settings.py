"""Settings from environment variables (see .env.example at the repo root)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="TB_", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://trailbuddies:trailbuddies@localhost:5432/trailbuddies"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]

    # The web app. Magic links and the Google callback point here; the web app proxies
    # /api/* to this API so the session cookie is first-party.
    web_url: str = "http://localhost:3000"
    session_days: int = 60
    # Plan for new families. The closed beta gives everyone Family (6 learner profiles).
    default_plan: str = "family"
    invite_days: int = 7
    cookie_secure: bool = False  # True in production (HTTPS only)
    magic_link_minutes: int = 15
    magic_links_per_hour: int = 5
    policy_version: str = "2026-10"

    # Outgoing email (generic SMTP). Empty host in development: the link is printed to the log.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Trailbuddies <hello@trailbuddies.africa>"
    smtp_starttls: bool = True
    smtp_ssl: bool = False

    # Google sign-in: off until both are set.
    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
