import json
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/shopvirsa_db"
    SECRET_KEY: str  # required — set via .env or environment; no insecure fallback
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    APP_NAME: str = "Shopvirsa"
    DEBUG: bool = True
    # Plain string, NOT List[str]: pydantic-settings requires JSON-array
    # syntax for env vars typed as a list and hard-crashes the app on startup
    # otherwise (e.g. ALLOWED_ORIGINS=https://example.com without brackets/
    # quotes) — a host UI where you'd naturally paste a bare URL. Comma-
    # separated, a single origin, or a JSON array are all accepted below.
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:4173"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> list[str]:
        raw = self.ALLOWED_ORIGINS.strip()
        if raw.startswith("["):
            try:
                items = json.loads(raw)
            except json.JSONDecodeError:
                items = [raw]
        else:
            items = raw.split(",")
        # Origins never include a trailing slash — strip one if pasted in.
        return [o.strip().rstrip("/") for o in items if o.strip()]

    @field_validator("DATABASE_URL")
    @classmethod
    def _use_async_driver(cls, v: str) -> str:
        # Hosts (Railway, Heroku, etc.) commonly hand out a plain
        # postgres://.../postgresql://... URL, which SQLAlchemy loads with
        # the sync psycopg2 driver by default. The app uses an async engine,
        # so force the asyncpg driver regardless of what scheme was given.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v


settings = Settings()
