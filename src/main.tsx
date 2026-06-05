import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

void setupNativeUI();

createRoot(document.getElementById("root")!).render(<App />);
