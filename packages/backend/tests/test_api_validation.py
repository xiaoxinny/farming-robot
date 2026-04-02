"""Tests for API request validation on the /api/auth/callback endpoint.

**Validates: Requirement 8 (AC 8.3)**

The /api/auth/callback endpoint requires both `code` and `code_verifier` fields.
Missing or empty payloads should return 422 with a detail array.
"""

import pytest


@pytest.mark.asyncio
async def test_callback_missing_code(client):
    """POST /api/auth/callback with missing code → 422."""
    resp = await client.post("/api/auth/callback", json={"code_verifier": "some-verifier"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_callback_missing_code_verifier(client):
    """POST /api/auth/callback with missing code_verifier → 422."""
    resp = await client.post("/api/auth/callback", json={"code": "some-code"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_callback_empty_body(client):
    """POST /api/auth/callback with empty body → 422."""
    resp = await client.post("/api/auth/callback", json={})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert body["code"] == "VALIDATION_ERROR"
