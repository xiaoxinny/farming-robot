import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  LayoutDashboard,
  Radio,
  Bell,
  BarChart3,
  FlaskConical,
  LogOut,
  Menu,
} from "lucide-react";

const navItems = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Sensors", to: "/dashboard/sensors", icon: Radio },
  { label: "Alerts", to: "/dashboard/alerts", icon: Bell },
  { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
  { label: "Simulations", to: "/dashboard/simulations", icon: FlaskConical },
] as const;

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-200
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <LayoutDashboard className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold text-gray-900">AgriTech</span>
        </div>

        <nav
          className="flex-1 overflow-y-auto p-4"
          aria-label="Dashboard navigation"
        >
          <ul className="space-y-1">
            {navItems.map(({ label, to, icon: Icon, ...rest }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={"end" in rest}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
          <button
            type="button"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {user?.name ?? user?.email ?? "User"}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
