interface ErrorRetryProps {
  message: string;
  onRetry: () => void;
}

/**
 * Reusable error display with a retry button.
 * Used by dashboard widgets for consistent error handling.
 */
export function ErrorRetry({ message, onRetry }: ErrorRetryProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-center"
    >
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
