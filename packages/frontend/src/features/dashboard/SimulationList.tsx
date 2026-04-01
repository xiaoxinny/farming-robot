import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "./ErrorRetry";

interface SimulationSummary {
  id: string;
  title: string;
  description: string;
}

interface SimulationsResponse {
  data: SimulationSummary[];
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

export function SimulationList() {
  const { data, isLoading, isError, error, refetch } =
    useQuery<SimulationsResponse>({
      queryKey: ["simulations"],
      queryFn: () => api.get<SimulationsResponse>("/api/simulations"),
    });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={
          error instanceof Error ? error.message : "Failed to load simulations"
        }
        onRetry={() => refetch()}
      />
    );
  }

  const simulations = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Simulations</h1>
      <p className="text-gray-600">Farm operation simulations.</p>

      {simulations.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No simulations available.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((sim) => (
            <Link
              key={sim.id}
              to={`/dashboard/simulations/${sim.id}`}
              className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">{sim.title}</h3>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {sim.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
