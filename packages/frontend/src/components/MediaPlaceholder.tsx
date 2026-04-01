import { cn } from "@/lib/utils";

interface MediaPlaceholderProps {
  /** Descriptive alt text indicating the intended media content. */
  alt: string;
  /** Width of the placeholder (CSS value, e.g. "100%", 640). */
  width?: string | number;
  /** CSS aspect-ratio value (e.g. "16/9", "4/3"). */
  aspectRatio?: string;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Styled placeholder component used in place of final images and videos.
 * Preserves the intended aspect ratio and dimensions while displaying
 * descriptive alt text for accessibility.
 */
export function MediaPlaceholder({
  alt,
  width,
  aspectRatio,
  className,
}: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted px-4 py-6 text-center text-sm text-muted-foreground",
        className,
      )}
      style={{
        width: width ?? "100%",
        aspectRatio: aspectRatio,
      }}
    >
      {alt}
    </div>
  );
}
