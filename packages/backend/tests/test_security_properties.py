"""Property-based tests for backend security module.

Feature: cognito-oidc-auth
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.core.config import get_settings
from app.core.security import exchange_code_for_tokens, parse_id_token_claims, refresh_tokens


# ---------------------------------------------------------------------------
# Property 4: Token exchange request is correctly formed
# Tag: Feature: cognito-oidc-auth, Property 4: Token exchange request is correctly formed
# Validates: Requirements 2.4, 4.4, 12.2
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@settings(max_examples=20, deadline=None)
@given(
    code=st.text(min_size=1),
    code_verifier=st.text(min_size=1),
)
async def test_token_exchange_request_is_correctly_formed(code: str, code_verifier: str) -> None:
    """**Validates: Requirements 2.4, 4.4, 12.2**

    For any authorization code and code_verifier, the HTTP request sent to the
    Cognito token endpoint must include grant_type=authorization_code, the code,
    the code_verifier, redirect_uri equal to the configured COGNITO_REDIRECT_URI,
    and client_id equal to the configured COGNITO_CLIENT_ID.
    """
    cfg = get_settings()

    mock_response = httpx.Response(
        200,
        json={
            "access_token": "at",
            "id_token": "idt",
            "refresh_token": "rt",
            "expires_in": 3600,
        },
    )

    captured: dict = {}

    async def _capture_post(self, url, *, data=None, **kwargs):  # noqa: ANN001, ANN003
        captured["url"] = str(url)
        captured["data"] = data
        return mock_response

    with patch.object(httpx.AsyncClient, "post", _capture_post):
        await exchange_code_for_tokens(code, code_verifier, settings=cfg)

    assert captured["data"]["grant_type"] == "authorization_code"
    assert captured["data"]["code"] == code
    assert captured["data"]["code_verifier"] == code_verifier
    assert captured["data"]["redirect_uri"] == cfg.COGNITO_REDIRECT_URI
    assert captured["data"]["client_id"] == cfg.COGNITO_CLIENT_ID
    assert captured["url"] == cfg.cognito_token_url


# ---------------------------------------------------------------------------
# Property 5: ID token claims are correctly extracted to user profile
# Tag: Feature: cognito-oidc-auth, Property 5: ID token claims are correctly extracted to user profile
# Validates: Requirements 2.5, 6.3
# ---------------------------------------------------------------------------

_uuid_like = st.from_regex(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", fullmatch=True)
_email_like = st.from_regex(r"[a-z]{1,10}@[a-z]{1,10}\.[a-z]{2,4}", fullmatch=True)
_optional_name = st.one_of(st.none(), st.text(min_size=1, max_size=50))


@settings(max_examples=20)
@given(
    sub=_uuid_like,
    email=_email_like,
    name=_optional_name,
)
def test_id_token_claims_are_correctly_extracted(sub: str, email: str, name: str | None) -> None:
    """**Validates: Requirements 2.5, 6.3**

    For any valid Cognito ID token containing sub, email, and optionally name
    claims, the profile extraction function must return a dict where id equals
    the sub claim, email equals the email claim, and name equals the name claim
    (or None if absent).
    """
    claims: dict = {"sub": sub, "email": email}
    if name is not None:
        claims["name"] = name

    with patch("app.core.security.validate_token", return_value=claims):
        profile = parse_id_token_claims("fake-token")

    assert profile["id"] == sub
    assert profile["email"] == email
    assert profile["name"] == name


# ---------------------------------------------------------------------------
# Property 9: Token refresh request is correctly formed
# Tag: Feature: cognito-oidc-auth, Property 9: Token refresh request is correctly formed
# Validates: Requirements 4.2, 4.4
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@settings(max_examples=20, deadline=None)
@given(
    refresh_token=st.text(min_size=1),
)
async def test_token_refresh_request_is_correctly_formed(refresh_token: str) -> None:
    """**Validates: Requirements 4.2, 4.4**

    For any refresh token string, the HTTP request sent to the Cognito token
    endpoint must include grant_type=refresh_token, the refresh_token, and
    client_id equal to the configured COGNITO_CLIENT_ID.
    """
    cfg = get_settings()

    mock_response = httpx.Response(
        200,
        json={
            "access_token": "at",
            "id_token": "idt",
            "expires_in": 3600,
        },
    )

    captured: dict = {}

    async def _capture_post(self, url, *, data=None, **kwargs):  # noqa: ANN001, ANN003
        captured["url"] = str(url)
        captured["data"] = data
        return mock_response

    with patch.object(httpx.AsyncClient, "post", _capture_post):
        await refresh_tokens(refresh_token, settings=cfg)

    assert captured["data"]["grant_type"] == "refresh_token"
    assert captured["data"]["refresh_token"] == refresh_token
    assert captured["data"]["client_id"] == cfg.COGNITO_CLIENT_ID
    assert captured["url"] == cfg.cognito_token_url
