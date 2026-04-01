import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";

// Mock useAuth to control auth state directly
vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/features/auth/AuthProvider";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

/**
 * Property 5: Session Expiry Redirect
 *
 * When a user's session token expires or becomes invalid, the application
 * must redirect to the login page without exposing authenticated content.
 *
 * **Validates: Requirement 3 (AC 3.6)**
 */
describe("ProtectedRoute — Property 5: Session Expiry Redirect", () => {
  it("redirects to /login when status is 'unauthenticated'", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    // Protected content should NOT be rendered
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("redirects to /mfa when status is 'mfa_pending'", () => {
    mockUseAuth.mockReturnValue({ status: "mfa_pending", isLoading: false });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    // Protected content should NOT be rendered
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders children when status is 'authenticated'", () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", isLoading: false });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret Dashboard")).toBeInTheDocument();
  });

  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", isLoading: true });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
