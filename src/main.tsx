import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { requestGuardedReload } from "./lib/pwa-update-guard";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  requestGuardedReload("chunk");
});

void setupNativeUI();

createRoot(document.getElementById("root")!).render(<App />);
