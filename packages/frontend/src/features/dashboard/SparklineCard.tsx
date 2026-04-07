import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { TrendPoint } from "@/types/dashboard";

interface SparklineCardProps {
  label: string;
  value: number;
  unit: string;
  data: TrendPoint[];
  color: string;
}

export function SparklineCard({
  label,
  value,
  unit,
  data,
  color,
}: SparklineCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>}
      </p>
      <div className="mt-2 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#gradient-${label})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
