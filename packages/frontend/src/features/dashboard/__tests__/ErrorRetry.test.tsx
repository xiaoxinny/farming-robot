import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MetricsOverview } from "../MetricsOverview";

// Mock the api module
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const MOCK_FARM_RESPONSE = {
  data: {
    farm_id: "farm-1",
    name: "Test Farm",
    location: "Singapore",
    status: "active",
    metrics: {
      avg_temperature: 28.5,
      avg_humidity: 75,
      avg_soil_moisture: 42,
      active_alerts: 3,
    },
  },
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * Property 7: Dashboard Error Recovery
 *
 * When the backend returns an error for a dashboard data request,
 * the UI must show an error state with a functional retry mechanism.
 *
 * **Validates: Requirement 4 (AC 4.4)**
 */
describe("MetricsOverview — Property 7: Dashboard Error Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error message when API fails and retries on button click", async () => {
    const user = userEvent.setup();

    // First call fails
    mockApi.get.mockRejectedValueOnce(new Error("Network error"));

    renderWithQueryClient(<MetricsOverview />);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    // Now mock a successful response for the retry
    mockApi.get.mockResolvedValueOnce(MOCK_FARM_RESPONSE);

    // Click retry
    await user.click(screen.getByRole("button", { name: "Retry" }));

    // Verify a new request was made (initial fail + retry)
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    // Verify data renders after successful retry
    await waitFor(() => {
      expect(screen.getByText("Farm Overview")).toBeInTheDocument();
    });
  });

  it("displays the error message from the API response", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("Server unavailable"));

    renderWithQueryClient(<MetricsOverview />);

    await waitFor(() => {
      expect(screen.getByText("Server unavailable")).toBeInTheDocument();
    });
  });
});
