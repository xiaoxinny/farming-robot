import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";

const MAX_ATTEMPTS = 3;

export function MfaChallenge() {
  const { status, verifyMfa, isLoading } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if user isn't in the MFA pending state
  if (!isLoading && status !== "mfa_pending") {
    return (
      <Navigate
        to={status === "authenticated" ? "/dashboard" : "/login"}
        replace
      />
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;

    setError("");
    setSubmitting(true);
    try {
      await verifyMfa(code);
      // On success, AuthProvider sets status to 'authenticated'
      // and the redirect above will handle navigation on next render
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (err instanceof ApiError && err.status === 403) {
        setLocked(true);
        setError(
          "Your account has been locked due to too many failed attempts. Please contact support.",
        );
      } else if (nextAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError(
          "Your account has been locked due to too many failed attempts. Please contact support.",
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Invalid code. Please try again.",
        );
      }
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {locked ? (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Please check your email for instructions to unlock your account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="mfa-code"
                className="block text-sm font-medium text-gray-700"
              >
                Verification code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                placeholder="000000"
              />
            </div>
            {attempts > 0 && !locked && (
              <p className="text-center text-xs text-gray-500">
                {MAX_ATTEMPTS - attempts} attempt
                {MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || code.length < 6}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
