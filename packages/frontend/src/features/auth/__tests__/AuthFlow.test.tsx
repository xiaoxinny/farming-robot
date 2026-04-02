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
  buildAuthorizeUrl: vi.fn(
    (challenge: string, state: string) =>
      `https://cognito.example.com/oauth2/authorize?code_challenge=${challenge}&state=${state}`,
  ),
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
import { buildAuthorizeUrl } from "@/lib/auth";

const mockPost = api.post as ReturnType<typeof vi.fn>;

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * OIDC Authentication Flow Tests
 *
 * Tests the OIDC authorization code flow with PKCE:
 * loginWithRedirect → handleCallback → authenticated
 *
 * **Validates: Requirements 1.2, 2.3, 5.1**
 */
describe("AuthFlow - OIDC Authorization Code Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Prevent jsdom from navigating on location.href assignment
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, href: "" },
    });
  });

  it("initial state is 'unauthenticated' when token refresh fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("No session"));

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.status).toBe("unauthenticated");
  });

  it("loginWithRedirect stores PKCE params in sessionStorage and calls buildAuthorizeUrl", async () => {
    mockPost.mockRejectedValueOnce(new Error("No session"));

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));

    await act(async () => {
      await captured!.loginWithRedirect();
    });

    expect(sessionStorage.getItem("pkce_code_verifier")).toBe("test-verifier");
    expect(sessionStorage.getItem("oauth_state")).toBe("test-state");
    expect(buildAuthorizeUrl).toHaveBeenCalledWith("test-challenge", "test-state");
  });

  it("handleCallback transitions to 'authenticated' state", async () => {
    mockPost.mockRejectedValueOnce(new Error("No session"));

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.status).toBe("unauthenticated");

    const mockUser = { id: "1", email: "user@example.com", name: "Test User" };
    mockPost.mockResolvedValueOnce({ user: mockUser });

    await act(async () => {
      await captured!.handleCallback("auth-code-123", "verifier-456");
    });

    expect(captured?.status).toBe("authenticated");
    expect(captured?.user).toEqual(mockUser);
    expect(mockPost).toHaveBeenCalledWith("/auth/callback", {
      code: "auth-code-123",
      code_verifier: "verifier-456",
    });
  });

  it("logout calls backend and gets logout_url", async () => {
    // Start authenticated via successful token refresh
    const mockUser = { id: "1", email: "user@example.com", name: "Test" };
    mockPost.mockResolvedValueOnce({ user: mockUser });

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.status).toBe("authenticated");

    const logoutUrl = "https://cognito.example.com/logout?client_id=abc";
    mockPost.mockResolvedValueOnce({ logout_url: logoutUrl });

    await act(async () => {
      await captured!.logout();
    });

    expect(mockPost).toHaveBeenCalledWith("/auth/logout");
    expect(window.location.href).toBe(logoutUrl);
  });
});
