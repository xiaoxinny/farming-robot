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
 * Property 3: Authentication Flow State Machine
 *
 * The auth flow must follow a valid state progression:
 * Unauthenticated -> Primary Auth -> MFA Challenge -> Authenticated.
 * No state can be skipped.
 *
 * **Validates: Requirements 3 (AC 3.1-3.4)**
 */
describe("AuthFlow - Property 3: Authentication Flow State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.status).toBe("unauthenticated");
  });

  it("login with MFA required transitions to mfa_pending", async () => {
    mockPost.mockRejectedValueOnce(new Error("No session"));

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.status).toBe("unauthenticated");

    mockPost.mockResolvedValueOnce({ mfa_required: true });
    await act(async () => {
      await captured!.login("user@example.com", "password123");
    });

    expect(captured?.status).toBe("mfa_pending");
  });

  it("verifyMfa transitions from mfa_pending to authenticated", async () => {
    mockPost.mockRejectedValueOnce(new Error("No session"));

    let captured: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthConsumer
        onRender={(ctx) => {
          captured = ctx;
        }}
      />,
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));

    // Login -> MFA required
    mockPost.mockResolvedValueOnce({ mfa_required: true });
    await act(async () => {
      await captured!.login("user@example.com", "password123");
    });
    expect(captured?.status).toBe("mfa_pending");

    // Verify MFA -> authenticated
    const mockUser = { id: "1", email: "user@example.com", name: "Test" };
    mockPost.mockResolvedValueOnce({ user: mockUser });
    await act(async () => {
      await captured!.verifyMfa("123456");
    });
    expect(captured?.status).toBe("authenticated");
    expect(captured?.user).toEqual(mockUser);
  });

  it("state transitions follow unauthenticated -> mfa_pending -> authenticated for any valid credentials (property test)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 50 }),
          mfaCode: fc.stringMatching(/^[0-9]{6}$/),
        }),
        async ({ email, password, mfaCode }) => {
          vi.clearAllMocks();

          // Token refresh fails -> unauthenticated
          mockPost.mockRejectedValueOnce(new Error("No session"));

          const states: string[] = [];
          let captured: ReturnType<typeof useAuth> | null = null;

          const { unmount } = render(
            <AuthConsumer
              onRender={(ctx) => {
                captured = ctx;
                if (
                  !ctx.isLoading &&
                  (states.length === 0 ||
                    states[states.length - 1] !== ctx.status)
                ) {
                  states.push(ctx.status);
                }
              }}
            />,
            { wrapper: createWrapper() },
          );

          // Wait for initial load to complete
          await waitFor(() => expect(captured?.isLoading).toBe(false));

          // Login -> MFA required
          mockPost.mockResolvedValueOnce({ mfa_required: true });
          await act(async () => {
            await captured!.login(email, password);
          });

          // Wait for mfa_pending state to be captured
          await waitFor(() => expect(captured?.status).toBe("mfa_pending"));

          // Verify MFA -> authenticated
          mockPost.mockResolvedValueOnce({
            user: { id: "u1", email, name: "User" },
          });
          await act(async () => {
            await captured!.verifyMfa(mfaCode);
          });

          // Wait for authenticated state to be captured
          await waitFor(() => expect(captured?.status).toBe("authenticated"));

          // Verify the full state progression
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
