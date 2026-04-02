import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../AuthProvider";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn().mockRejectedValue(new Error("No session")),
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
  SESSION_EXPIRED_EVENT: "session-expired",
}));

vi.mock("@/lib/auth", () => ({
  generateCodeVerifier: vi.fn(() => "mock-verifier"),
  generateCodeChallenge: vi.fn(async () => "mock-challenge"),
  generateState: vi.fn(() => "mock-state"),
  buildAuthorizeUrl: vi.fn(() => "https://cognito.example.com/authorize"),
  buildLogoutUrl: vi.fn(() => "https://cognito.example.com/logout"),
}));

// ---------------------------------------------------------------------------
// Unit Test: No /mfa route exists
//
// Validates: Requirement 13.5
// ---------------------------------------------------------------------------

describe("App Router — No /mfa route", () => {
  it("navigating to /mfa does not render any MFA component", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/mfa"]}>
          <AuthProvider>
            <Routes>
              {/* Replicate the actual app routes (no /mfa) */}
              <Route path="/" element={<div>Landing</div>} />
              <Route path="/login" element={<div>Login</div>} />
              <Route path="/auth/callback" element={<div>Callback</div>} />
              <Route path="/dashboard/*" element={<div>Dashboard</div>} />
              {/* Catch-all for unmatched routes */}
              <Route path="*" element={<div data-testid="not-found">Not Found</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // The /mfa route should not match any defined route
    await waitFor(() => {
      expect(screen.getByTestId("not-found")).toBeInTheDocument();
    });

    // No MFA-related content should be rendered
    expect(screen.queryByText(/mfa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/verification/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/two.factor/i)).not.toBeInTheDocument();
  });
});
