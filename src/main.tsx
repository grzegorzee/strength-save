import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { requestGuardedReload } from "./lib/pwa-update-guard";
import { configurePurchases } from "./lib/purchases";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  requestGuardedReload("chunk");
});

void setupNativeUI();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
