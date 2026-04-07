import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { ConnectionStatus } from "@/types/dashboard";

interface IsaacSimViewportProps {
  connectionStatus: ConnectionStatus;
  streamUrl: string;
}

const QUALITY_OPTIONS = ["low", "medium", "high"] as const;

export function IsaacSimViewport({ connectionStatus, streamUrl }: IsaacSimViewportProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>("medium");

  const isConnected = connectionStatus === "connected";

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Viewport</h3>
        {isConnected && (
          <div className="flex items-center gap-3">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              aria-label="Stream quality"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* 16:9 aspect ratio viewport */}
      <div className={`relative overflow-hidden rounded-lg bg-gray-900 ${isFullscreen ? "fixed inset-0 z-50" : "aspect-video"}`}>
        {isConnected && streamUrl ? (
          <iframe
            src={`${streamUrl}${streamUrl.includes("?") ? "&" : "?"}quality=${quality}`}
            title="Isaac Sim Viewport"
            className="h-full w-full border-0"
            allow="fullscreen"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              {connectionStatus === "connecting"
                ? "Connecting to Isaac Sim…"
                : "Configure and connect to Isaac Sim to view the simulation viewport."}
            </p>
          </div>
        )}

        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 rounded-md bg-black/50 p-2 text-white hover:bg-black/70"
            aria-label="Exit fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
