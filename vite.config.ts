import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { version } from "./package.json";

const getNodeModulePackageName = (id: string) => {
  const [, afterNodeModules] = id.split("node_modules/");
  if (!afterNodeModules) return "vendor";

  const segments = afterNodeModules.split("/");
  if (segments[0].startsWith("@")) {
    return `${segments[0]}-${segments[1] || "pkg"}`.replace("@", "");
  }

  return segments[0];
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/strength-save/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StrengthSave - Tracker Treningowy',
        short_name: 'StrengthSave',
        description: 'Aplikacja do śledzenia treningów siłowych i postępów',
        theme_color: '#0a0a1a',
        background_color: '#0a0a1a',
        display: 'standalone',
        scope: '/strength-save/',
        start_url: '/strength-save/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallbackDenylist: [/strava-callback\.html/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("firebase")) return "firebase";
          if (id.includes("recharts")) return "charts";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("react-router-dom")) return "router";
          if (id.includes("react-dom") || id.includes("react")) return "react-vendor";
          if (id.includes("lucide-react")) return "icons";
          return `vendor-${getNodeModulePackageName(id)}`;
        },
      },
    },
  },
}));
