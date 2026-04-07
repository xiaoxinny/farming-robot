import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "@/features/landing/LandingPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { CallbackPage } from "@/features/auth/CallbackPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardLayout } from "@/features/dashboard/DashboardLayout";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { SensorDataWidget } from "@/features/dashboard/SensorDataWidget";
import { AlertsWidget } from "@/features/dashboard/AlertsWidget";
import { SensorTimeSeriesChart } from "@/features/dashboard/SensorTimeSeriesChart";
import { WeatherWidget } from "@/features/dashboard/WeatherWidget";
import { CropHealthWidget } from "@/features/dashboard/CropHealthWidget";
import { RobotFleetWidget } from "@/features/dashboard/RobotFleetWidget";
import { IsaacSimPanel } from "@/features/dashboard/IsaacSimPanel";
import { SimulationList } from "@/features/dashboard/SimulationList";

const LazySimulationViewer = lazy(() =>
  import("@/features/dashboard/SimulationViewer").then((m) => ({
    default: m.SimulationViewer,
  })),
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="sensors" element={<SensorDataWidget />} />
              <Route path="alerts" element={<AlertsWidget />} />
              <Route path="analytics" element={<SensorTimeSeriesChart />} />
              <Route path="weather" element={<WeatherWidget />} />
              <Route path="crop-health" element={<CropHealthWidget />} />
              <Route path="robot-fleet" element={<RobotFleetWidget />} />
              <Route path="isaac-sim" element={<IsaacSimPanel />} />
              <Route path="simulations" element={<SimulationList />} />
              <Route
                path="simulations/:id"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <LazySimulationViewer />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
