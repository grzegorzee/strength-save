import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupNativeUI } from "./lib/native-setup";
import { configurePurchases } from "./lib/purchases";

void setupNativeUI();
void configurePurchases();

createRoot(document.getElementById("root")!).render(<App />);
