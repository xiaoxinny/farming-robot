"""JWT validation, Cognito client wrapper, and MFA failure tracking."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

import boto3
import httpx
from jose import JWTError, jwk, jwt

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWKS cache (module-level, thread-safe)
# ---------------------------------------------------------------------------
_jwks_cache: dict[str, Any] = {}
_jwks_lock = threading.Lock()
_JWKS_TTL_SECONDS = 3600  # re-fetch keys every hour


def _jwks_url(settings: Settings) -> str:
    """Derive the Cognito JWKS URL from pool config."""
    return (
        f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/"
        f"{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    )


def _get_jwks(settings: Settings) -> dict[str, Any]:
    """Return cached JWKS keys, refreshing if stale."""
    global _jwks_cache  # noqa: PLW0603
    with _jwks_lock:
        if (
            _jwks_cache.get("keys")
            and time.time() - _jwks_cache.get("fetched_at", 0) < _JWKS_TTL_SECONDS
        ):
            return _jwks_cache

    url = _jwks_url(settings)
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    with _jwks_lock:
        _jwks_cache = {"keys": data["keys"], "fetched_at": time.time()}
    return _jwks_cache


def validate_token(token: str, settings: Settings | None = None) -> dict[str, Any]:
    """Validate a Cognito-issued JWT and return its claims.

    Raises ``JWTError`` when the token is invalid or expired.
    """
    if settings is None:
        settings = get_settings()

    jwks = _get_jwks(settings)
    headers = jwt.get_unverified_headers(token)
    kid = headers.get("kid")

    key_data: dict[str, Any] | None = None
    for k in jwks["keys"]:
        if k["kid"] == kid:
            key_data = k
            break

    if key_data is None:
        raise JWTError("Public key not found in JWKS")

    public_key = jwk.construct(key_data)

    issuer = (
        f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}"
    )

    claims = jwt.decode(
        token,
        public_key.to_dict(),
        algorithms=["RS256"],
        audience=settings.COGNITO_CLIENT_ID,
        issuer=issuer,
    )
    return claims


# ---------------------------------------------------------------------------
# MFA failure tracker (in-memory, thread-safe)
# ---------------------------------------------------------------------------
_mfa_failures: dict[str, int] = {}
_mfa_lock = threading.Lock()
MAX_MFA_ATTEMPTS = 3


def get_mfa_failure_count(username: str) -> int:
    """Return the current consecutive MFA failure count for a user."""
    with _mfa_lock:
        return _mfa_failures.get(username, 0)


def record_mfa_failure(username: str) -> int:
    """Increment and return the MFA failure count for *username*."""
    with _mfa_lock:
        _mfa_failures[username] = _mfa_failures.get(username, 0) + 1
        return _mfa_failures[username]


def reset_mfa_failures(username: str) -> None:
    """Reset the MFA failure counter after a successful verification."""
    with _mfa_lock:
        _mfa_failures.pop(username, None)


# ---------------------------------------------------------------------------
# Cognito client wrapper
# ---------------------------------------------------------------------------


class CognitoClient:
    """Thin wrapper around the ``cognito-idp`` boto3 client.

    All configuration is pulled from the application ``Settings`` instance
    so nothing is hardcoded.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = boto3.client(
            "cognito-idp",
            region_name=self.settings.AWS_REGION,
        )

    # -- public helpers -----------------------------------------------------

    def authenticate(self, email: str, password: str) -> dict[str, Any]:
        """Initiate username/password authentication.

        Returns either:
        * ``{"tokens": {...}}`` when no MFA is required, or
        * ``{"mfa_required": True, "session": "...", "username": "..."}``
          when the user must complete an MFA challenge.
        """
        resp = self._client.initiate_auth(
            ClientId=self.settings.COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": password,
            },
        )

        if (
            resp.get("ChallengeName") == "SMS_MFA"
            or resp.get("ChallengeName") == "SOFTWARE_TOKEN_MFA"
        ):
            return {
                "mfa_required": True,
                "session": resp["Session"],
                "challenge": resp["ChallengeName"],
                "username": email,
            }

        result = resp.get("AuthenticationResult", {})
        return {
            "tokens": {
                "access_token": result.get("AccessToken", ""),
                "id_token": result.get("IdToken", ""),
                "refresh_token": result.get("RefreshToken", ""),
                "expires_in": result.get("ExpiresIn", 3600),
            }
        }

    def verify_mfa(self, session: str, code: str, username: str) -> dict[str, Any]:
        """Respond to an MFA challenge.

        On success the failure counter is reset and tokens are returned.
        On the 3rd consecutive failure the account is locked via
        ``AdminDisableUser``.

        Returns ``{"tokens": {...}}`` on success.
        Raises ``MfaVerificationError`` on failure.
        """
        try:
            resp = self._client.respond_to_auth_challenge(
                ClientId=self.settings.COGNITO_CLIENT_ID,
                ChallengeName="SOFTWARE_TOKEN_MFA",
                Session=session,
                ChallengeResponses={
                    "USERNAME": username,
                    "SOFTWARE_TOKEN_MFA_CODE": code,
                },
            )
        except self._client.exceptions.CodeMismatchException:
            count = record_mfa_failure(username)
            if count >= MAX_MFA_ATTEMPTS:
                self._lock_account(username)
                raise AccountLockedError(username) from None
            raise MfaVerificationError(
                f"Invalid MFA code. {MAX_MFA_ATTEMPTS - count} attempt(s) remaining."
            ) from None

        # Success — reset counter and return tokens
        reset_mfa_failures(username)
        result = resp.get("AuthenticationResult", {})
        return {
            "tokens": {
                "access_token": result.get("AccessToken", ""),
                "id_token": result.get("IdToken", ""),
                "refresh_token": result.get("RefreshToken", ""),
                "expires_in": result.get("ExpiresIn", 3600),
            }
        }

    def refresh_token(self, refresh_tok: str) -> dict[str, Any]:
        """Exchange a refresh token for new access/id tokens."""
        resp = self._client.initiate_auth(
            ClientId=self.settings.COGNITO_CLIENT_ID,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={"REFRESH_TOKEN": refresh_tok},
        )
        result = resp.get("AuthenticationResult", {})
        return {
            "access_token": result.get("AccessToken", ""),
            "id_token": result.get("IdToken", ""),
            "expires_in": result.get("ExpiresIn", 3600),
        }

    def _lock_account(self, username: str) -> None:
        """Disable the user account in Cognito after too many MFA failures."""
        logger.warning(
            "Locking account for user %s after %d MFA failures", username, MAX_MFA_ATTEMPTS
        )
        self._client.admin_disable_user(
            UserPoolId=self.settings.COGNITO_USER_POOL_ID,
            Username=username,
        )


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class MfaVerificationError(Exception):
    """Raised when an MFA code is incorrect but the account is not yet locked."""


class AccountLockedError(Exception):
    """Raised when the account has been locked due to repeated MFA failures."""

    def __init__(self, username: str) -> None:
        self.username = username
        super().__init__(
            f"Account {username} has been locked after {MAX_MFA_ATTEMPTS} "
            "consecutive MFA failures. Please contact support."
        )
