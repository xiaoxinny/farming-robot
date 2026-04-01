import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "./ErrorRetry";

interface SensorReading {
  sensor_id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface SensorReadingsResponse {
  data: SensorReading[];
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-200" />
      ))}
    </div>
  );
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

export function SensorDataWidget() {
  const { data, isLoading, isError, error, refetch } =
    useQuery<SensorReadingsResponse>({
      queryKey: ["farm-sensors"],
      queryFn: () => api.get<SensorReadingsResponse>("/api/farms/sensors"),
      refetchInterval: 30_000,
    });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={
          error instanceof Error ? error.message : "Failed to load sensor data"
        }
        onRetry={() => refetch()}
      />
    );
  }

  const sensors = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Sensor Data</h2>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-[480px] w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Sensor</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sensors.map((s) => (
              <tr key={s.sensor_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {s.sensor_id}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">
                  {s.type.replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {s.value} <span className="text-gray-500">{s.unit}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatTimestamp(s.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
