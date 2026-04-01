"""Dependency injection for FastAPI endpoints."""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import Cookie, HTTPException, status
from jose import JWTError

from app.core.config import Settings
from app.core.config import get_settings as _get_settings
from app.core.security import validate_token


def get_settings() -> Settings:
    """Return the application settings instance."""
    return _get_settings()


def get_db_session() -> Generator:
    """Yield a database session.

    Stub — will be replaced with a real SQLAlchemy async session
    once the database layer is implemented.
    """
    raise NotImplementedError("Database session not configured yet")


async def get_current_user(
    access_token: str | None = Cookie(None),
) -> dict[str, Any]:
    """Extract and validate the JWT from the httpOnly cookie.

    Returns the decoded token claims as a dict.
    Raises 401 if the cookie is missing or the token is invalid/expired.
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        claims = validate_token(access_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    return claims
