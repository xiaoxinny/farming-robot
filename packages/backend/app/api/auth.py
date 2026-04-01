"""Authentication endpoints — thin proxy to AWS Cognito."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from app.core.security import (
    AccountLockedError,
    CognitoClient,
    MfaVerificationError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Pydantic request / response schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    """Payload for the login endpoint."""

    email: EmailStr
    password: str


class MfaVerifyRequest(BaseModel):
    """Payload for the MFA verification endpoint."""

    session: str
    code: str
    username: str


class AuthTokenResponse(BaseModel):
    """Returned when authentication completes successfully."""

    message: str = "authenticated"


class MfaChallengeResponse(BaseModel):
    """Returned when MFA verification is required."""

    mfa_required: bool = True
    session: str
    challenge: str
    username: str


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

_COOKIE_SETTINGS: dict = {
    "httponly": True,
    "secure": True,
    "samesite": "lax",
}

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


def _set_auth_cookies(response: Response, tokens: dict) -> None:
    """Set httpOnly auth cookies on the response."""
    max_age = tokens.get("expires_in", 3600)

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=tokens["access_token"],
        max_age=max_age,
        **_COOKIE_SETTINGS,
    )
    if tokens.get("refresh_token"):
        response.set_cookie(
            key=REFRESH_TOKEN_COOKIE,
            value=tokens["refresh_token"],
            max_age=30 * 24 * 3600,  # 30 days
            **_COOKIE_SETTINGS,
        )


def _clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies."""
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE, **_COOKIE_SETTINGS)
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE, **_COOKIE_SETTINGS)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/login", response_model=AuthTokenResponse | MfaChallengeResponse)
async def login(body: LoginRequest, response: Response) -> AuthTokenResponse | MfaChallengeResponse:
    """Authenticate with email and password.

    Returns an MFA challenge when the user pool requires it, otherwise
    sets httpOnly auth cookies and returns a success message.
    """
    client = CognitoClient()
    try:
        result = client.authenticate(body.email, body.password)
    except Exception as exc:
        logger.exception("Login failed for %s", body.email)
        raise HTTPException(status_code=401, detail="Invalid credentials") from exc

    if result.get("mfa_required"):
        return MfaChallengeResponse(
            session=result["session"],
            challenge=result["challenge"],
            username=result["username"],
        )

    _set_auth_cookies(response, result["tokens"])
    return AuthTokenResponse()


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    """Clear authentication cookies."""
    _clear_auth_cookies(response)
    return MessageResponse(message="logged out")


@router.post("/mfa/verify", response_model=AuthTokenResponse)
async def mfa_verify(body: MfaVerifyRequest, response: Response) -> AuthTokenResponse:
    """Verify an MFA code and complete authentication.

    On success, sets httpOnly auth cookies.
    After 3 consecutive failures the account is locked.
    """
    client = CognitoClient()
    try:
        result = client.verify_mfa(body.session, body.code, body.username)
    except AccountLockedError as exc:
        raise HTTPException(
            status_code=403,
            detail="Account locked after too many failed MFA attempts. Please contact support.",
        ) from exc
    except MfaVerificationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("MFA verification error for %s", body.username)
        raise HTTPException(status_code=401, detail="MFA verification failed") from exc

    _set_auth_cookies(response, result["tokens"])
    return AuthTokenResponse()


@router.post("/token/refresh", response_model=AuthTokenResponse)
async def token_refresh(request: Request, response: Response) -> AuthTokenResponse:
    """Refresh the access token using the refresh token cookie."""
    refresh_tok = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not refresh_tok:
        raise HTTPException(status_code=401, detail="No refresh token")

    client = CognitoClient()
    try:
        new_tokens = client.refresh_token(refresh_tok)
    except Exception as exc:
        logger.exception("Token refresh failed")
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Token refresh failed") from exc

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=new_tokens["access_token"],
        max_age=new_tokens.get("expires_in", 3600),
        **_COOKIE_SETTINGS,
    )
    return AuthTokenResponse()
