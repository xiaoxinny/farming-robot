import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../AuthProvider";

// Mock the auth module (PKCE helpers)
vi.mock("@/lib/auth", () => ({
  generateCodeVerifier: vi.fn(() => "test-verifier"),
  generateCodeChallenge: vi.fn(() => Promise.resolve("test-challenge")),
  generateState: vi.fn(() => "test-state"),
  buildAuthorizeUrl: vi.fn(() => "https://cognito.example.com/oauth2/authorize"),
}));

// Mock the api module
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

import { api } from "@/lib/api";

const mockApi = api as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

/** Helper component that exposes auth context for testing */
function AuthConsumer({
  onRender,
}: {
  onRender: (ctx: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();
  onRender(auth);
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * AuthProvider — OIDC Flow State Tests
 *
 * Tests the AuthProvider's state management for the OIDC authorization code flow.
 * The provider exposes: loginWithRedirect, handleCallback, logout.
 *
 * **Validates: Requirements 1.2, 2.3, 5.1, 13.4**
 */
describe("AuthProvider — OIDC Flow State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, href: "" },
    });
  });

  it("initial state is 'unauthenticated' when token refresh fails", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("No session"));

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    renderWithProviders(
      <AuthConsumer
        onRender={(ctx) => {
          capturedAuth = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedAuth?.isLoading).toBe(false);
    });

    expect(capturedAuth?.status).toBe("unauthenticated");
  });

  it("handleCallback sets user and transitions to 'authenticated'", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("No session"));

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    renderWithProviders(
      <AuthConsumer
        onRender={(ctx) => {
          capturedAuth = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedAuth?.isLoading).toBe(false);
    });
    expect(capturedAuth?.status).toBe("unauthenticated");

    const mockUser = { id: "u1", email: "user@example.com", name: "Test User" };
    mockApi.post.mockResolvedValueOnce({ user: mockUser });

    await act(async () => {
      await capturedAuth!.handleCallback("auth-code", "code-verifier");
    });

    expect(capturedAuth?.status).toBe("authenticated");
    expect(capturedAuth?.user).toEqual(mockUser);
  });

  it("logout clears state", async () => {
    // Start with a successful token refresh to be authenticated
    const mockUser = { id: "u1", email: "user@example.com", name: "Test" };
    mockApi.post.mockResolvedValueOnce({ user: mockUser });

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    renderWithProviders(
      <AuthConsumer
        onRender={(ctx) => {
          capturedAuth = ctx;
        }}
      />,
    );

    await waitFor(() => {
      expect(capturedAuth?.isLoading).toBe(false);
    });
    expect(capturedAuth?.status).toBe("authenticated");

    const logoutUrl = "https://cognito.example.com/logout?client_id=abc";
    mockApi.post.mockResolvedValueOnce({ logout_url: logoutUrl });

    await act(async () => {
      await capturedAuth!.logout();
    });

    expect(capturedAuth?.status).toBe("unauthenticated");
    expect(capturedAuth?.user).toBeNull();
    expect(window.location.href).toBe(logoutUrl);
  });
});
