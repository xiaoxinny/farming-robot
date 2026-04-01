"""Edge case tests for MFA lockout after three consecutive failures.

**Validates: Requirement 3 (AC 3.5)**
Property 4: MFA Lockout After Three Failures
"""

import pytest

from app.core.security import (
    MAX_MFA_ATTEMPTS,
    get_mfa_failure_count,
    record_mfa_failure,
    reset_mfa_failures,
)


@pytest.fixture(autouse=True)
def _clean_mfa_state():
    """Reset MFA failure state before each test."""
    # Reset any leftover state for our test users
    for user in ("user-a", "user-b", "user-c"):
        reset_mfa_failures(user)
    yield
    for user in ("user-a", "user-b", "user-c"):
        reset_mfa_failures(user)


class TestMfaFailureTracking:
    """Unit tests for the MFA failure tracking functions."""

    def test_initial_failure_count_is_zero(self):
        assert get_mfa_failure_count("user-a") == 0

    def test_record_mfa_failure_increments_counter(self):
        assert record_mfa_failure("user-a") == 1
        assert record_mfa_failure("user-a") == 2
        assert get_mfa_failure_count("user-a") == 2

    def test_reset_clears_counter(self):
        record_mfa_failure("user-a")
        record_mfa_failure("user-a")
        reset_mfa_failures("user-a")
        assert get_mfa_failure_count("user-a") == 0

    def test_max_mfa_attempts_is_three(self):
        assert MAX_MFA_ATTEMPTS == 3


class TestMfaLockoutSequences:
    """Edge case tests verifying lockout after exactly 3 consecutive failures."""

    def test_three_failures_reaches_lockout_threshold(self):
        """After exactly 3 failures, count equals MAX_MFA_ATTEMPTS."""
        for _ in range(3):
            record_mfa_failure("user-a")
        assert get_mfa_failure_count("user-a") == MAX_MFA_ATTEMPTS

    def test_two_failures_below_lockout_threshold(self):
        """Fewer than 3 failures must NOT trigger lockout."""
        record_mfa_failure("user-a")
        record_mfa_failure("user-a")
        assert get_mfa_failure_count("user-a") < MAX_MFA_ATTEMPTS

    def test_two_failures_reset_then_two_more_stays_below_threshold(self):
        """2 failures → success reset → 2 failures = not locked."""
        record_mfa_failure("user-a")
        record_mfa_failure("user-a")
        # Simulate a successful MFA verification
        reset_mfa_failures("user-a")
        assert get_mfa_failure_count("user-a") == 0

        record_mfa_failure("user-a")
        record_mfa_failure("user-a")
        assert get_mfa_failure_count("user-a") == 2
        assert get_mfa_failure_count("user-a") < MAX_MFA_ATTEMPTS

    def test_failures_are_isolated_per_user(self):
        """Failures for one user don't affect another."""
        record_mfa_failure("user-a")
        record_mfa_failure("user-a")
        record_mfa_failure("user-a")

        assert get_mfa_failure_count("user-a") == 3
        assert get_mfa_failure_count("user-b") == 0

    def test_reset_on_nonexistent_user_is_safe(self):
        """Resetting a user with no failures should not raise."""
        reset_mfa_failures("user-c")
        assert get_mfa_failure_count("user-c") == 0
