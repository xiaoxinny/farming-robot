import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Property 8: Simulation Viewer Lazy Loading
 *
 * The SimulationViewer bundle must not be included in the initial page load.
 * It must only load when the user navigates to a simulation view.
 * We verify that App.tsx uses React.lazy() with a dynamic import for SimulationViewer.
 *
 * **Validates: Requirement 5 (AC 5.4)**
 */
describe("SimulationViewer — Property 8: Lazy Loading", () => {
  it("App.tsx uses React.lazy with dynamic import for SimulationViewer", () => {
    const appPath = path.resolve(__dirname, "../../../App.tsx");
    const appSource = fs.readFileSync(appPath, "utf-8");

    // Verify lazy() is imported from react
    expect(appSource).toMatch(
      /import\s*\{[^}]*lazy[^}]*\}\s*from\s*["']react["']/,
    );

    // Verify Suspense is imported from react
    expect(appSource).toMatch(
      /import\s*\{[^}]*Suspense[^}]*\}\s*from\s*["']react["']/,
    );

    // Verify dynamic import of SimulationViewer
    expect(appSource).toMatch(/lazy\s*\(\s*\(\)\s*=>\s*\n?\s*import\s*\(/);
    expect(appSource).toMatch(/SimulationViewer/);

    // Verify SimulationViewer is NOT statically imported
    const staticImportPattern =
      /^import\s+\{[^}]*SimulationViewer[^}]*\}\s+from/m;
    expect(appSource).not.toMatch(staticImportPattern);

    // Verify Suspense wraps the lazy component
    expect(appSource).toMatch(/<Suspense\s+fallback=/);
  });

  it("SimulationViewer is not in the static import list of App.tsx", () => {
    const appPath = path.resolve(__dirname, "../../../App.tsx");
    const appSource = fs.readFileSync(appPath, "utf-8");

    // Extract all static import lines
    const staticImports = appSource
      .split("\n")
      .filter((line) => line.match(/^import\s+/) && !line.includes("lazy"));

    // None of the static imports should reference SimulationViewer directly
    const hasStaticSimViewer = staticImports.some(
      (line) =>
        line.includes("SimulationViewer") && !line.includes("SimulationList"),
    );
    expect(hasStaticSimViewer).toBe(false);
  });
});
