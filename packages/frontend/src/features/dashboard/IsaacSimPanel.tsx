import { useState, useEffect, useCallback } from "react";
import type { IsaacSimConfig, ConnectionStatus } from "@/types/dashboard";
import { IsaacSimViewport } from "@/features/dashboard/IsaacSimViewport";
import { IsaacSimScenarioList } from "@/features/dashboard/IsaacSimScenarioList";

const STORAGE_KEY = "isaac-sim-config";

const DEFAULT_CONFIG: IsaacSimConfig = { host: "", port: 8211, streamUrl: "" };

function loadConfig(): IsaacSimConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IsaacSimConfig;
      return parsed;
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: IsaacSimConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: "bg-gray-400",
  connecting: "bg-yellow-400",
  connected: "bg-green-500",
  error: "bg-red-500",
};

interface ValidationErrors {
  host?: string;
  port?: string;
}

function validate(config: IsaacSimConfig): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!config.host.trim()) errors.host = "Host is required";
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.port = "Port must be between 1 and 65535";
  }
  return errors;
}

export function IsaacSimPanel() {
  const [config, setConfig] = useState<IsaacSimConfig>(loadConfig);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [errorMessage, setErrorMessage] = useState("");

  // Persist config changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const handleConnect = useCallback(() => {
    const validationErrors = validate(config);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("connecting");
    setErrorMessage("");

    // Simulate connection attempt
    const timer = setTimeout(() => {
      if (config.streamUrl.trim()) {
        setStatus("connected");
      } else {
        setStatus("error");
        setErrorMessage("Failed to connect: no streaming URL provided");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [config]);

  const handleDisconnect = useCallback(() => {
    setStatus("disconnected");
    setErrorMessage("");
  }, []);

  const handleReconnect = useCallback(() => {
    handleConnect();
  }, [handleConnect]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">NVIDIA Isaac Sim</h2>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`} />
        <span className="text-sm font-medium capitalize text-gray-700">{status}</span>
        {status === "error" && errorMessage && (
          <span className="text-sm text-red-600">— {errorMessage}</span>
        )}
      </div>

      {/* Connection form */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Connection Settings</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="isaac-host" className="block text-sm font-medium text-gray-700">Host</label>
            <input
              id="isaac-host"
              type="text"
              value={config.host}
              onChange={(e) => setConfig((c) => ({ ...c, host: e.target.value }))}
              placeholder="e.g. 192.168.1.100"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.host && <p className="mt-1 text-xs text-red-600">{errors.host}</p>}
          </div>
          <div>
            <label htmlFor="isaac-port" className="block text-sm font-medium text-gray-700">Port</label>
            <input
              id="isaac-port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig((c) => ({ ...c, port: parseInt(e.target.value, 10) || 0 }))}
              min={1}
              max={65535}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.port && <p className="mt-1 text-xs text-red-600">{errors.port}</p>}
          </div>
          <div>
            <label htmlFor="isaac-stream" className="block text-sm font-medium text-gray-700">Streaming URL</label>
            <input
              id="isaac-stream"
              type="text"
              value={config.streamUrl}
              onChange={(e) => {
                const value = e.target.value.trim();
                setConfig((c) => ({ ...c, streamUrl: value }));
              }}
              placeholder="e.g. http://192.168.1.100:8211/stream"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          {status === "disconnected" && (
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Connect
            </button>
          )}
          {status === "connecting" && (
            <button type="button" disabled className="rounded-md bg-gray-400 px-4 py-2 text-sm font-medium text-white">
              Connecting…
            </button>
          )}
          {status === "connected" && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Disconnect
            </button>
          )}
          {status === "error" && (
            <button
              type="button"
              onClick={handleReconnect}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Viewport */}
      <IsaacSimViewport connectionStatus={status} streamUrl={config.streamUrl} />

      {/* Scenarios */}
      <IsaacSimScenarioList connectionStatus={status} />
    </div>
  );
}
