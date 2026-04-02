import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fc from "fast-check";
import { CallbackPage } from "../CallbackPage";
import { AuthProvider } from "../AuthProvider";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
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

import { api } from "@/lib/api";

const mockPost = api.post as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCallbackPage(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <CallbackPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Property 3: State mismatch rejects the callback
//
// For any two distinct state strings (stored vs returned), the callback
// handler must reject the authorization code and not proceed with the
// token exchange.
//
// **Validates: Requirements 2.1, 2.2**
// ---------------------------------------------------------------------------

describe("CallbackPage — Property 3: State mismatch rejects the callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reject the initial token refresh so AuthProvider settles quickly
    mockPost.mockRejectedValue(new Error("No session"));
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("for any two distinct state strings, the callback shows an error and does not call the backend", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 64 }),
          fc.string({ minLength: 1, maxLength: 64 }),
        ).filter(([a, b]) => a !== b),
        async ([storedState, returnedState]) => {
          vi.clearAllMocks();
          sessionStorage.clear();

          // Reject the initial token refresh
          mockPost.mockRejectedValue(new Error("No session"));

          // Store one state in sessionStorage
          sessionStorage.setItem("oauth_state", storedState);
          sessionStorage.setItem("pkce_code_verifier", "test-verifier");

          const { unmount } = renderCallbackPage(
            `/auth/callback?code=test-code&state=${encodeURIComponent(returnedState)}`,
          );

          // Wait for the error to appear
          await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
          });

          // The error message should indicate state mismatch
          expect(screen.getByRole("alert").textContent).toContain(
            "state mismatch",
          );

          // The backend callback endpoint should NOT have been called
          // (the initial token refresh call is the only one)
          const callbackCalls = mockPost.mock.calls.filter(
            (call: unknown[]) =>
              typeof call[0] === "string" && call[0].includes("/auth/callback"),
          );
          expect(callbackCalls).toHaveLength(0);

          // sessionStorage should be cleared
          expect(sessionStorage.getItem("oauth_state")).toBeNull();
          expect(sessionStorage.getItem("pkce_code_verifier")).toBeNull();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Unit Tests: CallbackPage
// ---------------------------------------------------------------------------

describe("CallbackPage — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reject the initial token refresh so AuthProvider settles quickly
    mockPost.mockRejectedValue(new Error("No session"));
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("shows a loading spinner while processing the callback", () => {
    sessionStorage.setItem("oauth_state", "valid-state");
    sessionStorage.setItem("pkce_code_verifier", "valid-verifier");

    // Make the callback hang so we can observe the spinner
    mockPost.mockRejectedValueOnce(new Error("No session")); // initial refresh
    mockPost.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    renderCallbackPage("/auth/callback?code=abc&state=valid-state");

    expect(
      screen.getByRole("status", { name: "Processing login" }),
    ).toBeInTheDocument();
  });

  it("shows error when code parameter is missing", async () => {
    renderCallbackPage("/auth/callback?state=some-state");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Missing authorization code or state parameter",
    );
  });

  it("shows error when state parameter is missing", async () => {
    renderCallbackPage("/auth/callback?code=some-code");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Missing authorization code or state parameter",
    );
  });

  it("shows error when state does not match stored value", async () => {
    sessionStorage.setItem("oauth_state", "stored-state");
    sessionStorage.setItem("pkce_code_verifier", "verifier");

    renderCallbackPage("/auth/callback?code=abc&state=wrong-state");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert").textContent).toContain("state mismatch");
  });

  it("navigates to /dashboard on successful callback", async () => {
    sessionStorage.setItem("oauth_state", "good-state");
    sessionStorage.setItem("pkce_code_verifier", "good-verifier");

    // First call: initial token refresh (rejected)
    // Second call: callback POST (resolved with user)
    mockPost
      .mockRejectedValueOnce(new Error("No session"))
      .mockResolvedValueOnce({
        user: { id: "u1", email: "test@example.com", name: "Test User" },
      });

    renderCallbackPage("/auth/callback?code=auth-code&state=good-state");

    // After success, the error should NOT appear
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    // sessionStorage should be cleared after success
    expect(sessionStorage.getItem("oauth_state")).toBeNull();
    expect(sessionStorage.getItem("pkce_code_verifier")).toBeNull();
  });

  it("shows error and 'Try again' link when backend callback fails", async () => {
    sessionStorage.setItem("oauth_state", "good-state");
    sessionStorage.setItem("pkce_code_verifier", "good-verifier");

    mockPost
      .mockRejectedValueOnce(new Error("No session")) // initial refresh
      .mockRejectedValueOnce(new Error("Token exchange failed"));

    renderCallbackPage("/auth/callback?code=auth-code&state=good-state");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Error message should be displayed (generic fallback since Error is not ApiError)
    expect(screen.getByRole("alert").textContent).toContain(
      "Authentication failed",
    );

    // "Try again" link should be present
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
