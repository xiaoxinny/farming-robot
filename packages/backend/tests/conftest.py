"""Shared test fixtures and environment setup.

Environment variables MUST be set before any app imports so that
pydantic-settings ``Settings`` picks up the test values.
"""

import os

# ── Set test env vars BEFORE any app code is imported ──────────────
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("COGNITO_USER_POOL_ID", "ap-southeast-1_TestPool")
os.environ.setdefault("COGNITO_CLIENT_ID", "test-client-id")

# Clear the lru_cache so Settings re-reads from the patched env
from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
async def client():
    """Yield an async HTTP client wired to the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
