import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, wireAuth } from "../api/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setSession: (token: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setBootstrapping] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessToken(token);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
  }, [setToken]);

  // Wire axios interceptors once.
  useEffect(() => {
    wireAuth({
      getAccessToken: () => tokenRef.current,
      setAccessToken: setToken,
      onForcedLogout: clearSession,
    });
  }, [setToken, clearSession]);

  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const refreshSession = useCallback(async () => {
    // Dedupe: StrictMode double-invokes effects in dev. Without this, two
    // /auth/refresh requests race and the second hits P2025 server-side.
    if (refreshInFlight.current) return refreshInFlight.current;

    const promise = (async () => {
      try {
        const refreshed = await api.post<{ accessToken: string; user: AuthUser }>(
          "/auth/refresh",
          {},
        );
        setToken(refreshed.data.accessToken);
        setUser(refreshed.data.user);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = promise;
    return promise;
  }, [setToken, clearSession]);

  // Boot: try refreshing once. If httpOnly cookie still valid, user lands authed.
  useEffect(() => {
    refreshSession().finally(() => setBootstrapping(false));
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
        email,
        password,
      });
      setToken(res.data.accessToken);
      setUser(res.data.user);
    },
    [setToken],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore; revoke locally regardless
    }
    clearSession();
  }, [clearSession]);

  const setSession = useCallback(
    (token: string, u: AuthUser) => {
      setToken(token);
      setUser(u);
    },
    [setToken],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isBootstrapping, login, logout, refreshSession, setSession }),
    [user, accessToken, isBootstrapping, login, logout, refreshSession, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
