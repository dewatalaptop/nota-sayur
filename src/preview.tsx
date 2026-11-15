import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { ReceiptImage, useReceiptImage } from "./Receipt";
import { logoBitmap } from "./lib/logo";
import type { Bitmap } from "./lib/logo";
import type { NotaPrint } from "./lib/escpos";
import "./index.css";

function logoUrl(): string {
  const c = document.createElement("canvas"); c.width = 400; c.height = 300;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 300);
  const gr = g.createRadialGradient(200, 130, 10, 200, 130, 110); gr.addColorStop(0, "#2e9d4f"); gr.addColorStop(1, "#bfe8c8");
  g.fillStyle = gr; g.beginPath(); g.arc(200, 130, 110, 0, 7); g.fill();
  g.fillStyle = "#14532d"; g.font = "bold 56px sans-serif"; g.textAlign = "center"; g.fillText("BU AYU", 200, 150);
  return c.toDataURL("image/jpeg", 0.9);
}
const mk = (withLogo: boolean): NotaPrint => ({
  shop: { name: "Toko Sayur Bu Ayu", phone: "081234567890", address: "Pasar Pagi Blok C No. 12, Kota Contoh", logo: withLogo ? "x" : undefined },
  buyer: "Ibu Siti Rahmawati", date: new Date(2026, 10, 14, 15, 17), no: "1414-003", paid: 100000,
  items: [
    { id: "1", name: "Wortel", pricePerKg: 15000, mode: "kg", value: 2 },
    { id: "2", name: "Bayam", pricePerKg: 5000, mode: "rp", value: 1000 },
    { id: "3", name: "Kangkung organik hidroponik super segar", pricePerKg: 12500, mode: "kg", value: 1.75 },
  ],
});
function One({ logo, withLogo, paper }: { logo: Bitmap | null; withLogo: boolean; paper: 32 | 48 }) {
  const r = useReceiptImage(mk(withLogo), paper, withLogo ? logo : null);
  return <div style={{ flex: "0 0 auto", width: paper === 32 ? 384 : 576 }}><ReceiptImage url={r.url} paper={paper} /></div>;
}
function P() {
  const [lg, setLg] = useState<Bitmap | null>(null);
  useEffect(() => { logoBitmap(logoUrl(), 384, 260).then(setLg); }, []);
  return <div style={{ display: "flex", gap: 24, padding: 16, background: "#e5e7e4", alignItems: "flex-start" }}>
    <One logo={lg} withLogo={false} paper={32} /><One logo={lg} withLogo={true} paper={32} />
  </div>;
}
createRoot(document.getElementById("root")!).render(<P />);
