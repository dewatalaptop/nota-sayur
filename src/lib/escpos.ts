import type { NotaItem } from "./calc.ts";
import { fmtKg, itemKg, itemTotal, notaTotal, rp } from "./calc.ts";
import type { Bitmap } from "./logo.ts";

export type Paper = 32 | 48; // kolom teks: 58mm / 80mm
export const dotsFor = (p: Paper) => (p === 32 ? 384 : 576);
export const logoDotsFor = (p: Paper) => (p === 32 ? 260 : 380);

export interface Shop {
  name: string;
  phone: string;
  address: string;
  logo?: string;
}
export interface NotaPrint {
  shop: Shop;
  buyer: string;
  date: Date;
  no: string;
  items: NotaItem[];
  paid?: number;
}

export const ATTR_1 = "Powered by Nuvora Systems";
export const ATTR_2 = "www.nuvora-systems.com";

export interface Line {
  t: string;
  a?: "l" | "c";
  b?: boolean;
  big?: boolean;
}

const wrap = (s: string, w: number): string[] => {
  const out: string[] = [];
  for (const para of s.split(/\r?\n/)) {
    let cur = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (word.length > w) {
        if (cur) {
          out.push(cur);
          cur = "";
        }
        out.push(word.slice(0, w));
        word = word.slice(w);
      }
      if (!cur) cur = word;
      else if ((cur + " " + word).length <= w) cur += " " + word;
      else {
        out.push(cur);
        cur = word;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
};
const lr = (l: string, r: string, w: number) => l.slice(0, Math.max(0, w - r.length - 1)).padEnd(w - r.length) + r;
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const p2 = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (d: Date) => `${p2(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const num = (n: number) => Math.round(n).toLocaleString("id-ID");

/** Satu-satunya sumber tata letak: dipakai pratinjau layar, cetak browser, dan ESC/POS. */
export function notaLines(n: NotaPrint, w: Paper): Line[] {
  const L: Line[] = [];
  const dash = "-".repeat(w);
  const dbl = "=".repeat(w);
  for (const t of wrap(n.shop.name || "Toko Sayur", w)) L.push({ t, a: "c", b: true, big: true });
  for (const t of wrap(n.shop.address, w)) L.push({ t, a: "c" });
  if (n.shop.phone.trim()) L.push({ t: "Telp/WA: " + n.shop.phone.trim(), a: "c" });
  L.push({ t: dbl });
  L.push({ t: lr("No", n.no, w) });
  L.push({ t: lr("Tanggal", fmtDate(n.date), w) });
  wrap(n.buyer, w - 9).forEach((t, i) => L.push({ t: (i === 0 ? "Pembeli  " : "         ") + t }));
  L.push({ t: dash });
  if (n.items.length === 0) L.push({ t: "(belum ada barang)", a: "c" });
  for (const i of n.items) {
    for (const t of wrap(i.name, w)) L.push({ t, b: true });
    const left = `  ${fmtKg(itemKg(i))} x ${num(i.pricePerKg)}/kg`;
    const right = rp(itemTotal(i));
    if (left.length + right.length + 1 <= w) L.push({ t: lr(left, right, w) });
    else {
      L.push({ t: left });
      L.push({ t: lr("", right, w) });
    }
  }
  L.push({ t: dash });
  L.push({ t: lr("TOTAL", rp(notaTotal(n.items)), w), b: true, big: true });
  if (n.paid && n.paid > 0) {
    L.push({ t: lr("Bayar", rp(n.paid), w) });
    L.push({ t: lr("Kembali", rp(Math.max(0, n.paid - notaTotal(n.items))), w) });
  }
  L.push({ t: dash });
  L.push({ t: "Terima kasih", a: "c", b: true });
  L.push({ t: "Selamat berbelanja kembali", a: "c" });
  L.push({ t: "" });
  L.push({ t: ATTR_1, a: "c" });
  L.push({ t: ATTR_2, a: "c" });
  return L;
}

export function notaText(n: NotaPrint, w: Paper): string {
  const c = (s: string) => " ".repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
  return notaLines(n, w)
    .map((l) => (l.a === "c" ? c(l.t) : l.t))
    .join("\n");
}

const enc = (s: string) =>
  Uint8Array.from(
    Array.from(s, (c) => {
      const k = c.charCodeAt(0);
      return k < 128 ? k : 63;
    }),
  );
const cat = (parts: Uint8Array[]) => {
  const o = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of parts) {
    o.set(p, i);
    i += p.length;
  }
  return o;
};

/** Raster dipotong per 24 baris supaya buffer printer kecil tidak penuh. */
function raster(b: Bitmap): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x1b, 0x61, 1)];
  for (let y = 0; y < b.h; y += 24) {
    const rows = Math.min(24, b.h - y);
    parts.push(
      Uint8Array.of(0x1d, 0x76, 0x30, 0, b.bpr & 255, b.bpr >> 8, rows & 255, rows >> 8),
      b.data.subarray(y * b.bpr, (y + rows) * b.bpr),
    );
  }
  parts.push(enc("\n"));
  return cat(parts);
}

export function escposBytes(n: NotaPrint, w: Paper, logo?: Bitmap | null): Uint8Array {
  const P: Uint8Array[] = [Uint8Array.of(0x1b, 0x40)];
  if (logo) P.push(raster(logo));
  for (const l of notaLines(n, w)) {
    P.push(Uint8Array.of(0x1b, 0x61, l.a === "c" ? 1 : 0, 0x1b, 0x45, l.b ? 1 : 0, 0x1d, 0x21, l.big ? 0x01 : 0), enc(l.t + "\n"));
  }
  P.push(Uint8Array.of(0x1b, 0x61, 0, 0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x64, 4));
  return cat(P);
}

/** Cetak seluruh nota sebagai gambar (bitmap penuh selebar kertas). */
export function escposImageBytes(bm: Bitmap): Uint8Array {
  return cat([Uint8Array.of(0x1b, 0x40), raster(bm), Uint8Array.of(0x1b, 0x64, 3)]);
}
