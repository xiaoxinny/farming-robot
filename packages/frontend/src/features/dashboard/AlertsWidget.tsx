import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "./ErrorRetry";

interface Alert {
  alert_id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AlertsResponse {
  data: Alert[];
}

const SEVERITY_STYLES: Record<Alert["severity"], string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded bg-gray-200" />
      ))}
    </div>
  );
}

export function AlertsWidget() {
  const { data, isLoading, isError, error, refetch } = useQuery<AlertsResponse>(
    {
      queryKey: ["farm-alerts"],
      queryFn: () => api.get<AlertsResponse>("/api/farms/alerts"),
      refetchInterval: 30_000,
    },
  );

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={
          error instanceof Error ? error.message : "Failed to load alerts"
        }
        onRetry={() => refetch()}
      />
    );
  }

  const alerts = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-500">No active alerts.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li
              key={a.alert_id}
              className="flex items-start gap-3 rounded-lg border bg-white p-4"
            >
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[a.severity]}`}
              >
                {a.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{a.message}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
              {a.acknowledged && (
                <span className="shrink-0 text-xs text-green-600">
                  Acknowledged
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
