import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "./ErrorRetry";

interface MetricsSummary {
  avg_temperature: number;
  avg_humidity: number;
  avg_soil_moisture: number;
  active_alerts: number;
}

interface FarmOverview {
  farm_id: string;
  name: string;
  location: string;
  status: string;
  metrics: MetricsSummary;
}

interface FarmOverviewResponse {
  data: FarmOverview;
}

const METRIC_CARDS = [
  {
    key: "avg_temperature",
    label: "Temperature",
    unit: "°C",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    key: "avg_humidity",
    label: "Humidity",
    unit: "%",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "avg_soil_moisture",
    label: "Soil Moisture",
    unit: "%",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "active_alerts",
    label: "Active Alerts",
    unit: "",
    color: "text-red-600",
    bg: "bg-red-50",
  },
] as const;

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-white p-4">
          <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function MetricsOverview() {
  const { data, isLoading, isError, error, refetch } =
    useQuery<FarmOverviewResponse>({
      queryKey: ["farm-overview"],
      queryFn: () => api.get<FarmOverviewResponse>("/api/farms/overview"),
      refetchInterval: 30_000,
    });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={
          error instanceof Error
            ? error.message
            : "Failed to load farm overview"
        }
        onRetry={() => refetch()}
      />
    );
  }

  const metrics = data?.data.metrics;
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Farm Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CARDS.map(({ key, label, unit, color, bg }) => (
          <div key={key} className={`rounded-lg border p-4 ${bg}`}>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>
              {metrics[key]}
              {unit && <span className="ml-1 text-sm font-normal">{unit}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
