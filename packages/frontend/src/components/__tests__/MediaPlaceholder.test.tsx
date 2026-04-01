import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import { MediaPlaceholder } from "../MediaPlaceholder";

/**
 * Property 2: Media Placeholder Alt Text Presence
 *
 * Every MediaPlaceholder component must render with non-empty alt text
 * for accessibility. For any non-empty alt string, the rendered DOM
 * element contains that alt text.
 *
 * **Validates: Requirement 2 (AC 2.2)**
 */
describe("MediaPlaceholder — Property 2: Alt Text Presence", () => {
  it("renders the alt text in the DOM for any non-empty string", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (alt) => {
          const { unmount } = render(<MediaPlaceholder alt={alt} />);

          // The element should have role="img" with the exact alt as aria-label
          const imgElement = screen.getByRole("img");
          expect(imgElement).toHaveAttribute("aria-label", alt);

          // The alt text should be present as text content inside the element
          expect(imgElement.textContent).toContain(alt.trim());

          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("applies aspect ratio style when provided", () => {
    render(<MediaPlaceholder alt="Test image" aspectRatio="16/9" />);
    const el = screen.getByRole("img", { name: "Test image" });
    expect(el).toHaveStyle({ aspectRatio: "16/9" });
  });

  it("defaults width to 100% when not specified", () => {
    render(<MediaPlaceholder alt="Default width" />);
    const el = screen.getByRole("img", { name: "Default width" });
    expect(el).toHaveStyle({ width: "100%" });
  });
});
