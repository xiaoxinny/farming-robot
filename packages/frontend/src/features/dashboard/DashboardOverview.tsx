import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import { SparklineCard } from "@/features/dashboard/SparklineCard";
import type { TrendsResponse } from "@/types/dashboard";

const METRIC_CONFIG: Record<string, { label: string; unit: string; color: string }> = {
  temperature: { label: "Temperature", unit: "°C", color: "#ea580c" },
  humidity: { label: "Humidity", unit: "%", color: "#2563eb" },
  soil_moisture: { label: "Soil Moisture", unit: "%", color: "#16a34a" },
  active_alerts: { label: "Active Alerts", unit: "", color: "#dc2626" },
};

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-white p-4">
          <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
          <div className="mb-2 h-8 w-16 rounded bg-gray-200" />
          <div className="h-12 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-6">
      <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
      <div className="h-48 rounded bg-gray-200" />
    </div>
  );
}

export function DashboardOverview() {
  const { data, isLoading, isError, error, refetch } = useQuery<TrendsResponse>({
    queryKey: ["farm-trends"],
    queryFn: () => api.get<TrendsResponse>("/api/farms/trends"),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
        <CardsSkeleton />
        <div className="grid gap-6 md:grid-cols-2">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorRetry
        message={error instanceof Error ? error.message : "Failed to load dashboard data"}
        onRetry={() => refetch()}
      />
    );
  }

  const metrics = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>

      {/* Metric sparkline cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const config = METRIC_CONFIG[m.metric] ?? {
            label: m.metric,
            unit: m.unit,
            color: "#6b7280",
          };
          return (
            <SparklineCard
              key={m.metric}
              label={config.label}
              value={m.current_value}
              unit={config.unit}
              data={m.points}
              color={config.color}
            />
          );
        })}
      </div>

      {/* Two-column layout: sensor trend chart + recent alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Mini sensor trend chart */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Sensor Trends</h3>
          <div className="space-y-3">
            {metrics
              .filter((m) => m.metric !== "active_alerts")
              .map((m) => {
                const config = METRIC_CONFIG[m.metric];
                return (
                  <div key={m.metric} className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: config?.color ?? "#6b7280" }}
                    />
                    <span className="text-sm text-gray-600">{config?.label ?? m.metric}</span>
                    <span className="ml-auto text-sm font-medium text-gray-900">
                      {m.current_value} {m.unit}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent alerts summary */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Alerts</h3>
          <RecentAlertsSummary />
        </div>
      </div>
    </div>
  );
}

function RecentAlertsSummary() {
  const { data, isLoading, isError } = useQuery<{ data: { alert_id: string; severity: string; message: string; timestamp: string }[] }>({
    queryKey: ["farm-alerts"],
    queryFn: () => api.get("/api/farms/alerts"),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-gray-500">Unable to load alerts.</p>;
  }

  const alerts = (data?.data ?? []).slice(0, 5);

  if (alerts.length === 0) {
    return <p className="text-sm text-gray-500">No active alerts.</p>;
  }

  const severityStyles: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.alert_id} className="flex items-start gap-2 text-sm">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${severityStyles[a.severity] ?? "bg-gray-100 text-gray-800"}`}>
            {a.severity}
          </span>
          <span className="text-gray-700">{a.message}</span>
        </li>
      ))}
    </ul>
  );
}
