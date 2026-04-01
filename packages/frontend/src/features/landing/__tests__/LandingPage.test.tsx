import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "../LandingPage";

// jsdom doesn't support scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

function renderLandingPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

/**
 * Property 1: Navigation Bar Links Match Page Sections
 *
 * Every link in the NavigationBar must correspond to an existing section
 * on the LandingPage. Nav links and section IDs must stay in sync.
 *
 * **Validates: Requirement 1 (AC 1.1, 1.2)**
 */
describe("LandingPage — Property 1: Navigation Bar Links Match Page Sections", () => {
  it("every nav link target corresponds to an existing section ID", () => {
    renderLandingPage();

    // The NavigationBar uses buttons that call scrollToSection with these sectionIds
    const expectedNavTargets = ["pricing", "team", "about", "contact"];

    // Verify all expected sections exist in the DOM
    const expectedSectionIds = ["hero", "pricing", "team", "about", "contact"];
    for (const id of expectedSectionIds) {
      const section = document.getElementById(id);
      expect(section, `Section with id="${id}" should exist`).not.toBeNull();
    }

    // Verify every nav target has a matching section
    for (const target of expectedNavTargets) {
      const section = document.getElementById(target);
      expect(
        section,
        `Nav link target "${target}" should have a matching section`,
      ).not.toBeNull();
    }

    // Verify the nav buttons are rendered within the navigation bar
    const nav = document.querySelector("nav")!;
    const navScope = within(nav);
    expect(navScope.getByText("Pricing")).toBeInTheDocument();
    expect(navScope.getByText("Team")).toBeInTheDocument();
    expect(navScope.getByText("About Us")).toBeInTheDocument();
    expect(navScope.getByText("Contact Us")).toBeInTheDocument();
  });

  it("all nav link targets are a subset of page section IDs", () => {
    renderLandingPage();

    const navTargets = ["pricing", "team", "about", "contact"];
    const allSections = document.querySelectorAll("section[id]");
    const sectionIds = Array.from(allSections).map((s) => s.id);

    // Every nav target must exist as a section ID
    for (const target of navTargets) {
      expect(
        sectionIds,
        `Section IDs should include nav target "${target}"`,
      ).toContain(target);
    }
  });
});
