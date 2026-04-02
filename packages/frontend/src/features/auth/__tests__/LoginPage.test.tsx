import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "../LoginPage";
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

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Unit Tests: LoginPage
// ---------------------------------------------------------------------------

describe("LoginPage — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reject the initial token refresh so AuthProvider settles quickly
    mockPost.mockRejectedValue(new Error("No session"));
  });

  it("renders a 'Sign in' button", async () => {
    renderLoginPage();

    // Wait for loading to finish
    const signInButton = await screen.findByRole("button", {
      name: /sign in/i,
    });
    expect(signInButton).toBeInTheDocument();
  });

  it("does not render any password input fields", async () => {
    renderLoginPage();

    // Wait for loading to finish
    await screen.findByRole("button", { name: /sign in/i });

    // No password fields should exist
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/password/i),
    ).not.toBeInTheDocument();
    const passwordInputs = document.querySelectorAll(
      'input[type="password"]',
    );
    expect(passwordInputs).toHaveLength(0);
  });

  it("does not render any email input fields", async () => {
    renderLoginPage();

    // Wait for loading to finish
    await screen.findByRole("button", { name: /sign in/i });

    // No email fields should exist
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    const emailInputs = document.querySelectorAll('input[type="email"]');
    expect(emailInputs).toHaveLength(0);
  });

  it("does not render any text input fields at all", async () => {
    renderLoginPage();

    // Wait for loading to finish
    await screen.findByRole("button", { name: /sign in/i });

    // No text inputs should exist
    const textInputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"]',
    );
    expect(textInputs).toHaveLength(0);
  });
});
