import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const STORAGE_KEY = "vestra_active_workspace";

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
}

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  active: WorkspaceSummary | null;
  setActive: (id: string) => void;
  isLoading: boolean;
  error: unknown;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY),
  );

  const { data, isLoading, error } = useQuery({
    enabled: !!user,
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get<{ workspaces: WorkspaceSummary[] } | WorkspaceSummary[]>(
        "/workspaces",
      );
      // API currently returns array directly; tolerate both shapes.
      return Array.isArray(res.data) ? res.data : res.data.workspaces;
    },
  });

  const workspaces = data ?? [];

  const active = useMemo(() => {
    if (!workspaces.length) return null;
    return (
      workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? null
    );
  }, [workspaces, activeId]);

  // Persist when valid.
  useEffect(() => {
    if (active) localStorage.setItem(STORAGE_KEY, active.id);
  }, [active]);

  const setActive = useCallback((id: string) => setActiveId(id), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspaces, active, setActive, isLoading, error }),
    [workspaces, active, setActive, isLoading, error],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  return ctx;
}
