import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyUpdate, onUpdate, startUpdateCheck } from "./lib/update";

// Bilah "versi baru" muncul di atas bila pembaruan terdeteksi saat aplikasi sedang dipakai.
function UpdateBar() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => onUpdate(setV), []);
  if (!v) return null;
  return (
    <div className="no-print fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold"
      style={{ background: "var(--brand-600)", color: "#fff", paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      <span>✨ Versi baru tersedia</span>
      <button onClick={() => applyUpdate(v)} className="rounded-full px-3 py-1" style={{ background: "#fff", color: "var(--brand-600)" }}>Perbarui</button>
    </div>
  );
}

startUpdateCheck();
createRoot(document.getElementById("root")!).render(<StrictMode><UpdateBar /><App /></StrictMode>);
