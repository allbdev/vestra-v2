import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PageSkeleton } from "@vestra/ui";
import { ProtectedRoute, PublicOnlyRoute } from "../auth/ProtectedRoute";
import { WorkspaceProvider } from "../workspace/WorkspaceProvider";

// Auth pages: small, keep eager.
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";

// Authed pages: lazy-load to keep initial bundle lean.
const DashboardPage = lazy(() =>
  import("../pages/app/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const TransactionsPage = lazy(() =>
  import("../pages/app/TransactionsPage").then((m) => ({ default: m.TransactionsPage })),
);
const CategoriesPage = lazy(() =>
  import("../pages/app/CategoriesPage").then((m) => ({ default: m.CategoriesPage })),
);
const RecurringPage = lazy(() =>
  import("../pages/app/RecurringPage").then((m) => ({ default: m.RecurringPage })),
);
const InvitesPage = lazy(() =>
  import("../pages/app/InvitesPage").then((m) => ({ default: m.InvitesPage })),
);
const SettingsPage = lazy(() =>
  import("../pages/app/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function Authed({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </WorkspaceProvider>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicOnlyRoute>
        <ForgotPasswordPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicOnlyRoute>
        <ResetPasswordPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/",
    element: (
      <Authed>
        <DashboardPage />
      </Authed>
    ),
  },
  {
    path: "/transactions",
    element: (
      <Authed>
        <TransactionsPage />
      </Authed>
    ),
  },
  {
    path: "/categories",
    element: (
      <Authed>
        <CategoriesPage />
      </Authed>
    ),
  },
  {
    path: "/recurring",
    element: (
      <Authed>
        <RecurringPage />
      </Authed>
    ),
  },
  {
    path: "/invites",
    element: (
      <Authed>
        <InvitesPage />
      </Authed>
    ),
  },
  {
    path: "/settings",
    element: (
      <Authed>
        <SettingsPage />
      </Authed>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
