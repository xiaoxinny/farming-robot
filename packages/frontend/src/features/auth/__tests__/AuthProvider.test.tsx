import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fc from "fast-check";
import { AuthProvider, useAuth } from "../AuthProvider";

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
 * Property 3: Authentication Flow State Machine
 *
 * The auth flow must follow a valid state progression:
 * Unauthenticated → Primary Auth → MFA Challenge → Authenticated.
 * No state can be skipped.
 *
 * **Validates: Requirement 3 (AC 3.1–3.4)**
 */
describe("AuthProvider — Property 3: Authentication Flow State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("after login() with MFA required, state becomes 'mfa_pending'", async () => {
    // Token refresh fails (no existing session)
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

    // Login returns mfa_required
    mockApi.post.mockResolvedValueOnce({ mfa_required: true });

    await act(async () => {
      await capturedAuth!.login("user@example.com", "password123");
    });

    expect(capturedAuth?.status).toBe("mfa_pending");
  });

  it("after verifyMfa(), state becomes 'authenticated'", async () => {
    // Token refresh fails
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

    // Login → MFA required
    mockApi.post.mockResolvedValueOnce({ mfa_required: true });
    await act(async () => {
      await capturedAuth!.login("user@example.com", "password123");
    });
    expect(capturedAuth?.status).toBe("mfa_pending");

    // Verify MFA → authenticated
    mockApi.post.mockResolvedValueOnce({
      user: { id: "1", email: "user@example.com", name: "Test" },
    });
    await act(async () => {
      await capturedAuth!.verifyMfa("123456");
    });
    expect(capturedAuth?.status).toBe("authenticated");
  });

  it("cannot skip from unauthenticated directly to authenticated without MFA (property test)", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1 }),
          mfaCode: fc.stringMatching(/^[0-9]{6}$/),
        }),
        async ({ email, password, mfaCode }) => {
          vi.clearAllMocks();

          // Token refresh fails → unauthenticated
          mockApi.post.mockRejectedValueOnce(new Error("No session"));

          const states: string[] = [];
          let capturedAuth: ReturnType<typeof useAuth> | null = null;

          const { unmount } = renderWithProviders(
            <AuthConsumer
              onRender={(ctx) => {
                capturedAuth = ctx;
                if (
                  !ctx.isLoading &&
                  (states.length === 0 ||
                    states[states.length - 1] !== ctx.status)
                ) {
                  states.push(ctx.status);
                }
              }}
            />,
          );

          await waitFor(() => {
            expect(capturedAuth?.isLoading).toBe(false);
          });

          // Login → MFA required
          mockApi.post.mockResolvedValueOnce({ mfa_required: true });
          await act(async () => {
            await capturedAuth!.login(email, password);
          });

          // Verify MFA → authenticated
          mockApi.post.mockResolvedValueOnce({
            user: { id: "1", email, name: "User" },
          });
          await act(async () => {
            await capturedAuth!.verifyMfa(mfaCode);
          });

          // Verify the state progression: unauthenticated → mfa_pending → authenticated
          expect(states).toEqual([
            "unauthenticated",
            "mfa_pending",
            "authenticated",
          ]);

          unmount();
        },
      ),
      { numRuns: 10 },
    );
  });
});
