import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import type { TimeSeriesResponse } from "@/types/dashboard";

const SENSOR_COLORS: Record<string, string> = {
  temperature: "#ea580c",
  humidity: "#2563eb",
  soil_moisture: "#16a34a",
  light: "#eab308",
};

const SENSOR_LABELS: Record<string, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  soil_moisture: "Soil Moisture",
  light: "Light",
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="h-80 rounded bg-gray-200" />
    </div>
  );
}

export function SensorTimeSeriesChart() {
  const { data, isLoading, isError, error, refetch } = useQuery<TimeSeriesResponse>({
    queryKey: ["sensor-timeseries"],
    queryFn: () => api.get<TimeSeriesResponse>("/api/farms/sensors/timeseries"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={error instanceof Error ? error.message : "Failed to load sensor data"}
        onRetry={() => refetch()}
      />
    );
  }

  const series = data?.data ?? [];
  if (series.length === 0) {
    return <p className="text-sm text-gray-500">No sensor data available.</p>;
  }

  // Merge all sensor data into a unified dataset keyed by timestamp
  const timestampMap = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const p of s.points) {
      const existing = timestampMap.get(p.timestamp) ?? { timestamp: p.timestamp };
      existing[s.sensor_type] = p.value;
      timestampMap.set(p.timestamp, existing);
    }
  }
  const chartData = Array.from(timestampMap.values()).sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp)),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Sensor Time Series</h2>
      <div className="rounded-lg border bg-white p-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(label) => new Date(String(label)).toLocaleString()}
              formatter={(value, name) => {
                const s = series.find((x) => x.sensor_type === name);
                return [`${value} ${s?.unit ?? ""}`, SENSOR_LABELS[String(name)] ?? String(name)];
              }}
            />
            <Legend formatter={(value: string) => SENSOR_LABELS[value] ?? value} />
            {series.map((s) => (
              <Line
                key={s.sensor_type}
                type="monotone"
                dataKey={s.sensor_type}
                stroke={SENSOR_COLORS[s.sensor_type] ?? "#6b7280"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
