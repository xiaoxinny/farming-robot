"""Property tests for API request validation.

**Validates: Requirement 8 (AC 8.3)**
Property 9: API Request Validation

For each endpoint, send payloads with missing required fields, wrong types,
and out-of-range values. Verify 422 response with detail array.
"""

import pytest


@pytest.mark.asyncio
async def test_login_missing_email(client):
    """POST /api/auth/login with missing email → 422."""
    resp = await client.post("/api/auth/login", json={"password": "secret123"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_login_missing_password(client):
    """POST /api/auth/login with missing password → 422."""
    resp = await client.post("/api/auth/login", json={"email": "user@example.com"})
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_login_invalid_email_format(client):
    """POST /api/auth/login with invalid email format → 422."""
    resp = await client.post(
        "/api/auth/login", json={"email": "not-an-email", "password": "secret123"}
    )
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_login_wrong_type_for_email(client):
    """POST /api/auth/login with wrong type for email → 422."""
    resp = await client.post("/api/auth/login", json={"email": 12345, "password": "secret123"})
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_login_empty_body(client):
    """POST /api/auth/login with empty body → 422."""
    resp = await client.post("/api/auth/login", json={})
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_mfa_verify_missing_fields(client):
    """POST /api/auth/mfa/verify with missing fields → 422."""
    resp = await client.post("/api/auth/mfa/verify", json={})
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_mfa_verify_missing_code(client):
    """POST /api/auth/mfa/verify with missing code → 422."""
    resp = await client.post(
        "/api/auth/mfa/verify", json={"session": "abc", "username": "user@example.com"}
    )
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_mfa_verify_wrong_type_for_code(client):
    """POST /api/auth/mfa/verify with wrong type for code → 422."""
    resp = await client.post(
        "/api/auth/mfa/verify",
        json={"session": "abc", "code": 123456, "username": "user@example.com"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"
