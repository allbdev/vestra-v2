import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, Toaster } from "@vestra/ui";
import { AuthProvider } from "./auth/AuthProvider";
import { InstallPrompt } from "./components/InstallPrompt";
import { router } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const status =
          (error as { response?: { status?: number } } | null)?.response?.status ?? 0;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

export function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <InstallPrompt />
          <Toaster />
        </AuthProvider>
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
