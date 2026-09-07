# Vite watcher verification

Result: **PASS**, 2026-09-06 at 14:06:17 UTC (16:06 local).

The parent agent's `server.watch.ignored` configuration was checked using a separate Vite process on `127.0.0.1:8093`, Chromium, and the synthetic E2E application. Google API requests were blocked. The test observed Vite WebSocket messages and main-frame navigation events after touching each existing file's timestamps without changing its content. The app's `main` region was visible and the Vite WebSocket was connected before measurement.

| File touched | Observation window | Full-reload messages | Main-frame navigations |
| --- | --- | --- | --- |
| `ios/App/App/public/index.html` | 2.5 seconds | 0 | 0 |
| `android/app/src/main/assets/public/index.html` | 2.5 seconds | 0 | 0 |
| Root `index.html` (positive control) | 2.5 seconds | 1 (`/index.html`) | 1 |

SHA-256 before and after matched for all three files. Original access/modification timestamps were restored, then the browser and the isolated Vite process were shut down. No additional root-index changes will be performed during final E2E runs. Ports 8080 and 8090 were not controlled or shut down.

Evidence: `vite-watch-verification.json` contains hashes and measured events; `vite-watch-server.log` contains the isolated server output. Two preliminary attempts used unsuitable first-child visibility locators (a hidden script, then the empty notification region) and stopped before the measurement; they are not counted as successful checks. The successful run used the application's `main` region.

The generated-file checks confirm that native build output no longer reloads this running page, while the root HTML positive control confirms that ordinary page reload handling remains enabled. They do not claim to cover every possible generated-file path or all React HMR behavior.

## Timer test fixtures checked during final integration

The full suite identified a costly deep comparison of WAV Buffers and a stale Capacitor mock. WAV comparison now uses `Buffer.equals`, preserving exact byte equality while avoiding deep object traversal. The existing rest-controller native mock now explicitly supplies `getPlatform: () => 'ios'`; otherwise the new platform check raised a TypeError caught by the notification scheduler. No production timer code or notification/deadline assertions changed.

Targeted verification: **23/23 passed** in `android-timer-resources.test.ts` and `rest-timer-controller.test.tsx`; see `timer-fixture-verification.log`. The parent subsequently confirmed the final full Vitest run: **464 files, 4041 passed**.
