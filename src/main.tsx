import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { configurePurchases } from "./lib/purchases";
import { initKeyboardInset } from "./lib/keyboard-inset";
import { installFirestoreCrashGuard } from "./lib/firestore-crash-guard";

installFirestoreCrashGuard(() => window.location.reload());
void setupNativeUI();
initKeyboardInset();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
