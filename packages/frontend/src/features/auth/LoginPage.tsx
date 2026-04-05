import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";

export function LoginPage() {
  const { loginWithRedirect, isLoading } = useAuth();
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");
    try {
      await loginWithRedirect();
    } catch {
      setError("Failed to initiate login. Please try again.");
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

        <button
          type="button"
          onClick={handleSignIn}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
