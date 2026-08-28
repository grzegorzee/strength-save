import { createRoot } from "react-dom/client";
import "./fonts.css";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { configurePurchases } from "./lib/purchases";
import { initKeyboardInset } from "./lib/keyboard-inset";
import { installFirestoreCrashGuard } from "./lib/firestore-crash-guard";
import { installResumeRepaint } from "./lib/resume-repaint";
import { markStartup } from "./lib/startup-performance";
import { applyStoredAccent } from "./lib/accent-theme";
import { installSystemTextZoom } from "./lib/system-text-zoom";

// F-T2: kolor przewodni z localStorage PRZED pierwszym renderem (bez mrugnięcia).
applyStoredAccent();
installFirestoreCrashGuard(() => window.location.reload());
installResumeRepaint();
installSystemTextZoom();
void setupNativeUI();
initKeyboardInset();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
requestAnimationFrame(() => markStartup('root-painted'));
// X29 WP-F: hide splasha przeniesiony do useEffect w App.tsx — render() w React 18
// jest asynchroniczny, więc wywołanie tutaj mogło zgasić splash przed pierwszą
// klatką Reacta (czarna szczelina na starcie).
