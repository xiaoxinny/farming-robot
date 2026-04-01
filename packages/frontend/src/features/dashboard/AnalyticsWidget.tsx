import { MediaPlaceholder } from "@/components/MediaPlaceholder";

/**
 * Placeholder component for the analytics/historical trends view.
 * Will be replaced with actual chart components in a future iteration.
 */
export function AnalyticsWidget() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
      <p className="text-sm text-gray-600">
        Historical trends and analysis will be displayed here. Charts for
        temperature, humidity, soil moisture, and pest activity over time are
        planned for a future release.
      </p>
      <MediaPlaceholder
        alt="Historical trend charts — temperature, humidity, and soil moisture over time"
        aspectRatio="16/9"
      />
    </div>
  );
}
