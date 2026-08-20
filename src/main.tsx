import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { configurePurchases } from "./lib/purchases";
import { initKeyboardInset } from "./lib/keyboard-inset";
import { installFirestoreCrashGuard } from "./lib/firestore-crash-guard";
import { installResumeRepaint } from "./lib/resume-repaint";
import { hideNativeSplashWhenReady } from "./lib/native-splash";
import { markStartup } from "./lib/startup-performance";
import { applyStoredAccent } from "./lib/accent-theme";

// F-T2: kolor przewodni z localStorage PRZED pierwszym renderem (bez mrugnięcia).
applyStoredAccent();
installFirestoreCrashGuard(() => window.location.reload());
installResumeRepaint();
void setupNativeUI();
initKeyboardInset();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
requestAnimationFrame(() => markStartup('root-painted'));
hideNativeSplashWhenReady();
