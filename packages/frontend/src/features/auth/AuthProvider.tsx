import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, SESSION_EXPIRED_EVENT } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthStatus = "unauthenticated" | "mfa_pending" | "authenticated";

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  /** True while the initial token-refresh check is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  loginPasswordless: (email: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to consume the auth context. Must be used inside an `<AuthProvider>`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [authState, setAuthState] = useState<AuthState>({
    status: "unauthenticated",
    user: null,
  });

  // ---- Initial token refresh on mount via TanStack Query ----
  const { isLoading } = useQuery({
    queryKey: ["auth", "refresh"],
    queryFn: async () => {
      const data = await api.post<{ user: User }>("/auth/token/refresh");
      setAuthState({ status: "authenticated", user: data.user });
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    // Stale immediately — we only need the initial check
    staleTime: Infinity,
  });

  // ---- Session-expired listener ----
  const clearAuth = useCallback(() => {
    setAuthState({ status: "unauthenticated", user: null });
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  useEffect(() => {
    const handler = () => clearAuth();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [clearAuth]);

  // ---- Auth methods ----
  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ mfa_required: boolean; user?: User }>(
      "/auth/login",
      { email, password },
    );
    if (data.mfa_required) {
      setAuthState({ status: "mfa_pending", user: null });
    } else if (data.user) {
      setAuthState({ status: "authenticated", user: data.user });
    }
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    const data = await api.post<{ user: User }>("/auth/mfa/verify", { code });
    setAuthState({ status: "authenticated", user: data.user });
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    clearAuth();
  }, [clearAuth]);

  const loginWithOAuth = useCallback(async (provider: string) => {
    // Redirect to backend OAuth initiation endpoint
    window.location.href = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/auth/oauth/${provider}`;
  }, []);

  const loginPasswordless = useCallback(async (email: string) => {
    await api.post("/auth/passwordless", { email });
    // After requesting the magic link / OTP the user stays unauthenticated
    // until they complete the flow via a callback URL.
  }, []);

  // ---- Memoised context value ----
  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      isLoading,
      login,
      verifyMfa,
      logout,
      loginWithOAuth,
      loginPasswordless,
    }),
    [
      authState,
      isLoading,
      login,
      verifyMfa,
      logout,
      loginWithOAuth,
      loginPasswordless,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
