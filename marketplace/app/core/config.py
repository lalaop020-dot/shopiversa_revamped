from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/shopvirsa_db"
    SECRET_KEY: str  # required — set via .env or environment; no insecure fallback
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    APP_NAME: str = "Shopvirsa"
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"

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
