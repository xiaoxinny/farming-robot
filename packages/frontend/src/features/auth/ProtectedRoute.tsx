import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import type { ReactNode } from "react";

/**
 * Wraps children in an auth check.
 *
 * - While the initial token refresh is in flight, shows a loading spinner.
 * - If unauthenticated, redirects to `/login`.
 * - If MFA is pending, redirects to `/mfa`.
 * - If authenticated, renders children.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, isLoading } = useAuth();

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

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "mfa_pending") {
    return <Navigate to="/mfa" replace />;
  }

  return <>{children}</>;
}
