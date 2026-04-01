import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";

type LoginMode = "password" | "passwordless";

export function LoginPage() {
  const { login, loginWithOAuth, loginPasswordless, isLoading } = useAuth();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordlessSent, setPasswordlessSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Login failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordlessLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginPasswordless(email);
      setPasswordlessSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to send magic link.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleOAuthGoogle() {
    loginWithOAuth("google");
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
        <h1 className="text-center text-2xl font-bold text-gray-900">
          Sign in to AgriTech
        </h1>

        {error && (
          <div
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* OAuth section */}
        <button
          type="button"
          onClick={handleOAuthGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-md border border-gray-300 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError("");
              setPasswordlessSent(false);
            }}
            className={`flex-1 rounded-l-md px-3 py-2 font-medium ${mode === "password" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("passwordless");
              setError("");
              setPasswordlessSent(false);
            }}
            className={`flex-1 rounded-r-md px-3 py-2 font-medium ${mode === "passwordless" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Magic Link
          </button>
        </div>

        {/* Password form */}
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {/* Passwordless form */}
        {mode === "passwordless" &&
          (passwordlessSent ? (
            <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
              A magic link has been sent to{" "}
              <span className="font-medium">{email}</span>. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handlePasswordlessLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="passwordless-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="passwordless-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send magic link"}
              </button>
            </form>
          ))}
      </div>
    </div>
  );
}
