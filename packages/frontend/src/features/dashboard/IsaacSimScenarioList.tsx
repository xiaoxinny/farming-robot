import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "@/features/dashboard/ErrorRetry";
import type { ConnectionStatus, ScenariosResponse, SimulationScenario } from "@/types/dashboard";

interface IsaacSimScenarioListProps {
  connectionStatus: ConnectionStatus;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 rounded bg-gray-200" />
      ))}
    </div>
  );
}

export function IsaacSimScenarioList({ connectionStatus }: IsaacSimScenarioListProps) {
  const [selected, setSelected] = useState<SimulationScenario | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<ScenariosResponse>({
    queryKey: ["simulation-scenarios"],
    queryFn: () => api.get<ScenariosResponse>("/api/simulations/scenarios"),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorRetry
        message={error instanceof Error ? error.message : "Failed to load scenarios"}
        onRetry={() => refetch()}
      />
    );
  }

  const scenarios = data?.data ?? [];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Simulation Scenarios</h3>

      {scenarios.length === 0 ? (
        <p className="text-sm text-gray-500">No scenarios available.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => (
            <button
              key={s.scenario_id}
              type="button"
              onClick={() => setSelected(selected?.scenario_id === s.scenario_id ? null : s)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selected?.scenario_id === s.scenario_id
                  ? "border-green-500 bg-green-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <p className="font-medium text-gray-900">{s.name}</p>
              <p className="mt-1 text-sm text-gray-600">{s.description}</p>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>Robot: {s.robot_type}</span>
                <span>~{s.estimated_duration_minutes} min</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected scenario details */}
      {selected && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <h4 className="font-medium text-gray-900">{selected.name}</h4>
          <p className="mt-1 text-sm text-gray-600">{selected.description}</p>
          <p className="mt-1 text-xs text-gray-500">
            Robot type: {selected.robot_type} · Duration: ~{selected.estimated_duration_minutes} min
          </p>
          {connectionStatus === "disconnected" ? (
            <p className="mt-3 text-sm text-yellow-700">
              Please connect to Isaac Sim first to launch this scenario.
            </p>
          ) : (
            <button
              type="button"
              className="mt-3 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Launch in Isaac Sim
            </button>
          )}
        </div>
      )}
    </div>
  );
}
