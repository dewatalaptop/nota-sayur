import { NotaItem, fmtKg, itemKg, itemTotal, notaTotal, rp } from "./calc";

export type Paper = 32 | 48; // 58mm / 80mm

const enc = (s: string) => Uint8Array.from(Array.from(s, (c) => (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 63)));
const pad = (l: string, r: string, w: number) => l.slice(0, Math.max(0, w - r.length - 1)).padEnd(w - r.length) + r;
const center = (s: string, w: number) => " ".repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

export interface NotaPrint {
  shop: string;
  buyer: string;
  date: Date;
  items: NotaItem[];
  paid?: number;
}

export function notaText(n: NotaPrint, w: Paper): string {
  const L: string[] = [];
  const line = "-".repeat(w);
  L.push(center(n.shop, w), center(n.date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }), w), line);
  L.push("Pembeli: " + n.buyer, line);
  for (const i of n.items) {
    L.push(i.name);
    L.push(pad(`  ${fmtKg(itemKg(i))} x ${rp(i.pricePerKg)}/kg`, rp(itemTotal(i)), w));
  }
  L.push(line, pad("TOTAL", rp(notaTotal(n.items)), w));
  if (n.paid && n.paid > 0) {
    L.push(pad("Bayar", rp(n.paid), w), pad("Kembali", rp(Math.max(0, n.paid - notaTotal(n.items))), w));
  }
  L.push(line, center("Terima kasih", w));
  return L.join("\n");
}

export function escposBytes(n: NotaPrint, w: Paper): Uint8Array {
  const parts = [Uint8Array.of(0x1b, 0x40), enc(notaText(n, w) + "\n"), Uint8Array.of(0x1b, 0x64, 4)];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
