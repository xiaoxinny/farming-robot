"""Property-based and unit tests for auth callback, logout, and refresh endpoints.

Feature: cognito-oidc-auth
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.core.security import TokenExchangeError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _find_cookie(headers_list: list[str], name: str) -> str | None:
    """Find a set-cookie header by cookie name (case-insensitive start)."""
    prefix = f"{name}="
    for c in headers_list:
        if c.lower().startswith(prefix):
            return c
    return None


def _cookie_is_deleted(cookie_header: str) -> bool:
    """Check if a set-cookie header represents a deleted cookie."""
    lower = cookie_header.lower()
    return "max-age=0" in lower


# ---------------------------------------------------------------------------
# Property 7: Auth cookies have correct security attributes and max_age
# Tag: Feature: cognito-oidc-auth, Property 7: Auth cookies have correct security attributes and max_age
# Validates: Requirements 11.1, 11.2, 11.3
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
@given(
    expires_in=st.integers(min_value=60, max_value=86400),
)
async def test_auth_cookies_have_correct_security_attributes(client, expires_in: int) -> None:
    """**Validates: Requirements 11.1, 11.2, 11.3**

    For any Cognito token response with an expires_in value of N seconds,
    the access_token cookie must be set with HttpOnly=True, Secure=True,
    SameSite=Lax, and max_age=N. The refresh_token cookie must be set with
    the same security attributes and max_age=2592000 (30 days).
    """
    mock_tokens = {
        "access_token": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig",
        "id_token": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig",
        "refresh_token": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig",
        "expires_in": expires_in,
    }
    mock_profile = {"id": "user-sub-123", "email": "test@example.com", "name": "Test"}

    with (
        patch(
            "app.api.auth.exchange_code_for_tokens",
            new_callable=AsyncMock,
            return_value=mock_tokens,
        ),
        patch(
            "app.api.auth.parse_id_token_claims",
            return_value=mock_profile,
        ),
    ):
        resp = await client.post(
            "/api/auth/callback",
            json={"code": "auth-code", "code_verifier": "verifier"},
        )

    assert resp.status_code == 200

    cookies = resp.headers.get_list("set-cookie")
    access_cookie = _find_cookie(cookies, "access_token")
    refresh_cookie = _find_cookie(cookies, "refresh_token")

    assert access_cookie is not None, "access_token cookie not found"
    assert refresh_cookie is not None, "refresh_token cookie not found"

    # Check access_token cookie attributes
    ac_lower = access_cookie.lower()
    assert "httponly" in ac_lower
    assert "secure" in ac_lower
    assert "samesite=lax" in ac_lower
    assert f"max-age={expires_in}" in ac_lower

    # Check refresh_token cookie attributes
    rc_lower = refresh_cookie.lower()
    assert "httponly" in rc_lower
    assert "secure" in rc_lower
    assert "samesite=lax" in rc_lower
    assert "max-age=2592000" in rc_lower


# ---------------------------------------------------------------------------
# Property 8: Logout clears both cookies and returns a valid Cognito logout URL
# Tag: Feature: cognito-oidc-auth, Property 8: Logout clears both cookies and returns a valid Cognito logout URL
# Validates: Requirements 5.2, 5.3, 11.4
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
@given(data=st.data())
async def test_logout_clears_cookies_and_returns_valid_url(client, data) -> None:
    """**Validates: Requirements 5.2, 5.3, 11.4**

    For any valid configuration, the logout endpoint must delete both cookies
    and return a logout_url that points to https://{COGNITO_DOMAIN}/logout
    with client_id and logout_uri query parameters.
    """
    resp = await client.post("/api/auth/logout")

    assert resp.status_code == 200

    body = resp.json()
    logout_url = body["logout_url"]

    # Verify the URL structure
    assert "https://" in logout_url
    assert "/logout" in logout_url
    assert "client_id=" in logout_url
    assert "logout_uri=" in logout_url

    # Verify cookies are deleted (set-cookie with max-age=0)
    cookies = resp.headers.get_list("set-cookie")
    access_cookie = _find_cookie(cookies, "access_token")
    refresh_cookie = _find_cookie(cookies, "refresh_token")

    assert access_cookie is not None, "access_token delete header not found"
    assert refresh_cookie is not None, "refresh_token delete header not found"
    assert _cookie_is_deleted(access_cookie), "access_token cookie was not deleted"
    assert _cookie_is_deleted(refresh_cookie), "refresh_token cookie was not deleted"


# ---------------------------------------------------------------------------
# Unit tests for auth endpoints (Task 3.9)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_callback_returns_401_when_token_exchange_fails(client) -> None:
    """Callback returns 401 when exchange_code_for_tokens raises TokenExchangeError."""
    with patch(
        "app.api.auth.exchange_code_for_tokens",
        new_callable=AsyncMock,
        side_effect=TokenExchangeError("Token exchange failed: invalid_grant"),
    ):
        resp = await client.post(
            "/api/auth/callback",
            json={"code": "bad-code", "code_verifier": "verifier"},
        )

    assert resp.status_code == 401
    body = resp.json()
    assert "Token exchange failed" in body["detail"]


@pytest.mark.asyncio
async def test_callback_returns_401_when_id_token_validation_fails(client) -> None:
    """Callback returns 401 when parse_id_token_claims raises an exception."""
    mock_tokens = {
        "access_token": "at",
        "id_token": "bad-id-token",
        "refresh_token": "rt",
        "expires_in": 3600,
    }

    with (
        patch(
            "app.api.auth.exchange_code_for_tokens",
            new_callable=AsyncMock,
            return_value=mock_tokens,
        ),
        patch(
            "app.api.auth.parse_id_token_claims",
            side_effect=Exception("Invalid ID token"),
        ),
    ):
        resp = await client.post(
            "/api/auth/callback",
            json={"code": "auth-code", "code_verifier": "verifier"},
        )

    assert resp.status_code == 401
    body = resp.json()
    assert "Invalid ID token" in body["detail"]


@pytest.mark.asyncio
async def test_refresh_clears_cookies_when_refresh_token_invalid(client) -> None:
    """Refresh endpoint clears cookies when refresh_tokens raises TokenExchangeError."""
    # Set the cookie on the client directly to avoid httpx deprecation warning
    client.cookies.set("refresh_token", "expired-token")

    with patch(
        "app.api.auth.refresh_tokens",
        new_callable=AsyncMock,
        side_effect=TokenExchangeError("Token refresh failed"),
    ):
        resp = await client.post("/api/auth/token/refresh")

    assert resp.status_code == 401

    # Verify cookies are cleared
    cookies = resp.headers.get_list("set-cookie")
    access_cookie = _find_cookie(cookies, "access_token")
    refresh_cookie = _find_cookie(cookies, "refresh_token")

    assert access_cookie is not None, "access_token delete header not found"
    assert refresh_cookie is not None, "refresh_token delete header not found"
    assert _cookie_is_deleted(access_cookie), "access_token cookie was not cleared"
    assert _cookie_is_deleted(refresh_cookie), "refresh_token cookie was not cleared"

    # Clean up client cookies for other tests
    client.cookies.clear()


@pytest.mark.asyncio
async def test_logout_returns_correct_cognito_logout_url(client) -> None:
    """Logout returns the correct Cognito logout URL with specific config values."""
    resp = await client.post("/api/auth/logout")

    assert resp.status_code == 200
    body = resp.json()
    logout_url = body["logout_url"]

    # Verify URL uses the test config values from conftest.py
    assert logout_url.startswith("https://test-app.auth.ap-southeast-1.amazoncognito.com/logout")
    assert "client_id=test-client-id" in logout_url
    assert "logout_uri=" in logout_url
