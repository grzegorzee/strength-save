import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { version } from "./package.json";

export default defineConfig({
  plugins: [react()],
  // WP-G: parytet z vite.config — bez tego define strony z etykietą wersji
  // (Profile, AppNavigation) padają w jsdom na ReferenceError, choc kazdy
  // build Vite ma stala podstawiona. Route sweep ma testowac dane, nie
  // dziure srodowiska testowego.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      reporter: ["text", "html"],
      thresholds: {
        lines: 8,
        functions: 28,
        statements: 8,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
