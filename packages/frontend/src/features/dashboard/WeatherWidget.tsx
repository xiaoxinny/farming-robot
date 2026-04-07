import { useQuery } from "@tanstack/react-query";
import { Cloud, Sun, CloudRain, CloudLightning, CloudSun, Wind, Droplets } from "lucide-react";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import type { CurrentWeatherResponse, ForecastResponse } from "@/types/dashboard";

const CONDITION_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  partly_cloudy: CloudSun,
  thunderstorm: CloudLightning,
};

function getConditionIcon(condition: string) {
  return CONDITION_ICONS[condition] ?? Cloud;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="h-32 rounded bg-gray-200" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export function WeatherWidget() {
  const current = useQuery<CurrentWeatherResponse>({
    queryKey: ["weather-current"],
    queryFn: () => api.get<CurrentWeatherResponse>("/api/weather/current"),
    refetchInterval: 60_000,
  });

  const forecast = useQuery<ForecastResponse>({
    queryKey: ["weather-forecast"],
    queryFn: () => api.get<ForecastResponse>("/api/weather/forecast"),
    refetchInterval: 60_000,
  });

  const isLoading = current.isLoading || forecast.isLoading;
  const isError = current.isError || forecast.isError;
  const errorMsg =
    current.error instanceof Error
      ? current.error.message
      : forecast.error instanceof Error
        ? forecast.error.message
        : "Failed to load weather data";

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={errorMsg}
        onRetry={() => {
          void current.refetch();
          void forecast.refetch();
        }}
      />
    );
  }

  const weather = current.data?.data;
  const days = forecast.data?.data ?? [];

  if (!weather) return null;

  const ConditionIcon = getConditionIcon(weather.condition);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Weather</h2>

      {/* Current conditions */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center gap-4">
          <ConditionIcon className="h-12 w-12 text-yellow-500" />
          <div>
            <p className="text-3xl font-bold text-gray-900">{weather.temperature}°C</p>
            <p className="text-sm capitalize text-gray-600">{weather.condition.replace("_", " ")}</p>
            <p className="text-xs text-gray-500">{weather.location}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-6">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Droplets className="h-4 w-4" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Wind className="h-4 w-4" />
            <span>{weather.wind_speed} km/h</span>
          </div>
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {days.map((day) => {
          const DayIcon = getConditionIcon(day.condition);
          return (
            <div key={day.date} className="rounded-lg border bg-white p-3 text-center">
              <p className="text-xs font-medium text-gray-500">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <DayIcon className="mx-auto my-2 h-6 w-6 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">{day.high}°</p>
              <p className="text-xs text-gray-500">{day.low}°</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
