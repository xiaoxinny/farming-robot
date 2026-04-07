import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import type { CropHealthResponse, ZoneCropHealth } from "@/types/dashboard";

const STATUS_BADGE: Record<ZoneCropHealth["health_status"], string> = {
  healthy: "bg-green-100 text-green-800",
  needs_attention: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<ZoneCropHealth["health_status"], string> = {
  healthy: "Healthy",
  needs_attention: "Needs Attention",
  critical: "Critical",
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-40 rounded bg-gray-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded bg-gray-200" />
      ))}
    </div>
  );
}

export function CropHealthWidget() {
  const { data, isLoading, isError, error, refetch } = useQuery<CropHealthResponse>({
    queryKey: ["crop-health"],
    queryFn: () => api.get<CropHealthResponse>("/api/crops/health"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={error instanceof Error ? error.message : "Failed to load crop health data"}
        onRetry={() => refetch()}
      />
    );
  }

  const zones = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Crop Health</h2>
      {zones.length === 0 ? (
        <p className="text-sm text-gray-500">No crop health data available.</p>
      ) : (
        <ul className="space-y-3">
          {zones.map((z) => (
            <li key={z.zone_id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{z.zone_name}</p>
                  <p className="text-sm text-gray-600">{z.crop_type} · {z.growth_stage}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[z.health_status]}`}>
                  {STATUS_LABEL[z.health_status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Last inspection: {new Date(z.last_inspection).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
