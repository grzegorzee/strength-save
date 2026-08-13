import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { configurePurchases } from "./lib/purchases";
import { initKeyboardInset } from "./lib/keyboard-inset";
import { installFirestoreCrashGuard } from "./lib/firestore-crash-guard";
import { installResumeRepaint } from "./lib/resume-repaint";

installFirestoreCrashGuard(() => window.location.reload());
installResumeRepaint();
void setupNativeUI();
initKeyboardInset();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
