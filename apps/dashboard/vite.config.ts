import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Vestra",
        short_name: "Vestra",
        description: "Controle financeiro pessoal e compartilhado",
        theme_color: "#22c55e",
        background_color: "#0c0c0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/v1/workspaces"),
            handler: "NetworkFirst",
            options: {
              cacheName: "vestra-api-read",
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@radix-ui") || id.includes("sonner")) return "vendor-ui";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("yup"))
            return "vendor-forms";
          if (id.includes("axios")) return "vendor-http";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("dayjs")) return "vendor-date";
          if (
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("victory-vendor")
          )
            return "vendor-charts";
          return "vendor";
        },
      },
    },
  },
});
