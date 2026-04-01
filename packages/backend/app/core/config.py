"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings.

    All values are loaded from environment variables.
    Secrets have no defaults and must be explicitly set.
    """

    # Application
    APP_NAME: str = "AgriTech Platform API"
    DEBUG: bool = False

    # Security — no defaults for secrets
    SECRET_KEY: str
    DATABASE_URL: str

    # AWS
    AWS_REGION: str = "ap-southeast-1"
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache
def get_settings() -> Settings:
    """Create and cache the settings instance.

    Uses lru_cache so the settings are loaded once and reused.
    This also allows the module to be imported without env vars
    being set (settings are only loaded when first accessed).
    """
    return Settings()  # type: ignore[call-arg]
