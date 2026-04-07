import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import type { RobotFleetResponse, Robot } from "@/types/dashboard";

const STATUS_BADGE: Record<Robot["status"], string> = {
  active: "bg-green-100 text-green-800",
  idle: "bg-gray-100 text-gray-800",
  charging: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
};

const TYPE_LABEL: Record<Robot["type"], string> = {
  drone: "Drone",
  ground_rover: "Ground Rover",
  harvester: "Harvester",
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="h-10 rounded bg-gray-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded bg-gray-200" />
      ))}
    </div>
  );
}

export function RobotFleetWidget() {
  const { data, isLoading, isError, error, refetch } = useQuery<RobotFleetResponse>({
    queryKey: ["robot-fleet"],
    queryFn: () => api.get<RobotFleetResponse>("/api/robots/fleet"),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={error instanceof Error ? error.message : "Failed to load robot fleet data"}
        onRetry={() => refetch()}
      />
    );
  }

  const summary = data?.summary;
  const robots = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Robot Fleet</h2>

      {/* Summary count bar */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          <SummaryBadge label="Active" count={summary.active} className="bg-green-100 text-green-800" />
          <SummaryBadge label="Idle" count={summary.idle} className="bg-gray-100 text-gray-800" />
          <SummaryBadge label="Charging" count={summary.charging} className="bg-blue-100 text-blue-800" />
          <SummaryBadge label="Maintenance" count={summary.maintenance} className="bg-yellow-100 text-yellow-800" />
        </div>
      )}

      {/* Robot list */}
      {robots.length === 0 ? (
        <p className="text-sm text-gray-500">No robots in fleet.</p>
      ) : (
        <ul className="space-y-3">
          {robots.map((r) => (
            <li
              key={r.robot_id}
              className={`rounded-lg border bg-white p-4 ${r.status === "maintenance" ? "border-yellow-300 bg-yellow-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-sm text-gray-600">
                    {TYPE_LABEL[r.type] ?? r.type} · {r.assigned_zone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{r.battery_level}% battery</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryBadge({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${className}`}>
      {label}: {count}
    </span>
  );
}
