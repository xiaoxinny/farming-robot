import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code || !state) {
        setError("Missing authorization code or state parameter.");
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("pkce_code_verifier");
        return;
      }

      const storedState = sessionStorage.getItem("oauth_state");
      if (state !== storedState) {
        setError(
          "Invalid login attempt — state mismatch. Please try again.",
        );
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("pkce_code_verifier");
        return;
      }

      const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
      if (!codeVerifier) {
        setError("Missing PKCE code verifier. Please try again.");
        sessionStorage.removeItem("oauth_state");
        return;
      }

      try {
        await handleCallback(code, codeVerifier);
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("pkce_code_verifier");
        navigate("/dashboard", { replace: true });
      } catch (err) {
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("pkce_code_verifier");
        setError(
          err instanceof ApiError
            ? err.message
            : "Authentication failed. Please try again.",
        );
      }
    }

    processCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md text-center">
          <div
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-green-600 hover:text-green-700"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Processing login"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />
    </div>
  );
}
