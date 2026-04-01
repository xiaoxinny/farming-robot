import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fc from "fast-check";
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

/**
 * Property 6: Dashboard Data Polling Freshness
 *
 * While the Dashboard is mounted, data queries must refetch at the
 * configured polling interval (30s). After N intervals, fetch count
 * should equal N+1 (initial + refetches).
 *
 * **Validates: Requirement 4 (AC 4.3)**
 */
describe("MetricsOverview — Property 6: Dashboard Data Polling Freshness", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches data at 30s polling interval (property test)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (intervals) => {
        vi.clearAllMocks();
        mockApi.get.mockResolvedValue(MOCK_FARM_RESPONSE);

        const queryClient = createQueryClient();
        const { unmount } = render(
          <QueryClientProvider client={queryClient}>
            <MetricsOverview />
          </QueryClientProvider>,
        );

        // Wait for initial fetch to complete and render
        await waitFor(() => {
          expect(screen.getByText("Farm Overview")).toBeInTheDocument();
        });

        // Advance timers by N intervals of 30 seconds
        for (let i = 0; i < intervals; i++) {
          await act(async () => {
            vi.advanceTimersByTime(30_000);
          });
        }

        // Total calls = 1 (initial) + N (refetches)
        const expectedCalls = intervals + 1;
        expect(mockApi.get).toHaveBeenCalledTimes(expectedCalls);

        unmount();
        queryClient.clear();
      }),
      { numRuns: 5 },
    );
  });

  it("makes initial fetch on mount", async () => {
    mockApi.get.mockResolvedValue(MOCK_FARM_RESPONSE);

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MetricsOverview />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Farm Overview")).toBeInTheDocument();
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith("/api/farms/overview");

    queryClient.clear();
  });
});
