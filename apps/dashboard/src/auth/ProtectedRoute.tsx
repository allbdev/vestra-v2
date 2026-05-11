import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { PageSkeleton } from "@vestra/ui";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <PageSkeleton />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  if (isBootstrapping) return <PageSkeleton />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
