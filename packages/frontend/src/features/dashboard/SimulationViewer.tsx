import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorRetry } from "./ErrorRetry";

interface Simulation {
  id: string;
  title: string;
  description: string;
  media_type: "video" | "image";
  signed_url: string;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600"
        role="status"
        aria-label="Loading simulation"
      />
    </div>
  );
}

export function SimulationViewer() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery<Simulation>({
    queryKey: ["simulation", id],
    queryFn: () => api.get<Simulation>(`/api/simulations/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
      <ErrorRetry
        message={
          error instanceof Error ? error.message : "Failed to load simulation"
        }
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
      <p className="text-gray-600">{data.description}</p>

      <div className="overflow-hidden rounded-lg border bg-black">
        {data.media_type === "video" ? (
          <video
            src={data.signed_url}
            controls
            className="w-full"
            aria-label={data.title}
          >
            Your browser does not support the video element.
          </video>
        ) : (
          <img
            src={data.signed_url}
            alt={data.title}
            className="w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
