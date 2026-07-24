import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isMobileBuild = mode === 'mobile';
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };

  if (isMobileBuild) {
    const requiredFirebaseEnv = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];
    const missingFirebaseEnv = requiredFirebaseEnv.filter((key) => !env[key]);

    if (missingFirebaseEnv.length > 0) {
      throw new Error(
        `Mobile build requires Firebase configuration. Missing: ${missingFirebaseEnv.join(', ')}. ` +
        'Create .env.mobile.local from .env.example.'
      );
    }
  }

  return {
    base: isMobileBuild ? './' : '/strength-save/',
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
      // Mobile (Capacitor): usuń atrybut crossorigin ze skryptów. Assety są
      // lokalne (serwowane przez capacitor://localhost), więc CORS jest zbędny,
      // a crossorigin bez nagłówków CORS maskuje błędy runtime jako "Script error.".
      isMobileBuild && {
        name: 'strip-crossorigin-mobile',
        transformIndexHtml(html: string) {
          return html.replace(/\s+crossorigin/g, '');
        },
      },
      VitePWA({
        disable: isMobileBuild,
        registerType: 'prompt',
        includeAssets: ['favicon.png', 'favicon.svg'],
        manifest: {
          name: 'StrengthSave - Tracker Treningowy',
          short_name: 'StrengthSave',
          description: 'Aplikacja do śledzenia treningów siłowych i postępów',
          theme_color: '#0e0e0e',
          background_color: '#0e0e0e',
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
          skipWaiting: false,
          clientsClaim: false,
          cleanupOutdatedCaches: true,
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
    optimizeDeps: {
      // Jawne wejście zamiast domyślnego globa '**/*.html' po całym repo:
      // build/sim (derivedData symulatora, 3+ GB) zawiera cykliczne symlinki
      // xcframeworków, na których fast-glob wisi w nieskończoność — dev server
      // nigdy nie kończył wtedy skanu zależności (page.goto timeout w e2e).
      entries: ['index.html'],
    },
    build: {
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            // Keep only the heaviest, low-risk libraries in dedicated chunks.
            // Over-splitting React/Radix internals created circular vendor chunks in production.
            if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) return "react-vendor";
            // Firebase w JEDNYM chunku. Split per produkt (Z54) tworzył cykl
            // firebase-core <-> firebase-auth i TDZ ReferenceError na starcie
            // (biały ekran na iOS build 50 i prod web, Z85).
            if (id.includes("firebase")) return "firebase";

            return undefined;
          },
        },
      },
    },
  };
});
