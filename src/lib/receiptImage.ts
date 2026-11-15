// Nota digambar sebagai gambar (canvas) lalu dicetak sebagai bitmap 1-bit.
// Keuntungan: huruf bagus & bervariasi, hiasan, rata kiri-kanan presisi, tidak bergantung
// jumlah kolom printer/codepage — dan pratinjau di layar PERSIS sama dengan hasil cetak.
import { fmtKg, itemKg, itemTotal, notaTotal, rp } from "./calc.ts";
import type { NotaPrint } from "./escpos.ts";
import type { Bitmap } from "./logo.ts";

const FONT = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const p2 = (n: number) => String(n).padStart(2, "0");
const num = (n: number) => Math.round(n).toLocaleString("id-ID");

export function renderReceipt(n: NotaPrint, dots: number, logo?: Bitmap | null): Bitmap {
  const k = dots / 384; // semua ukuran dirancang untuk 384 titik (58 mm)
  const W = dots;
  const M = 14 * k;
  const inner = W - 2 * M;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Math.round(7000 * k);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  g.lineJoin = "round";
  g.lineCap = "round";
  let y = 4 * k;

  const font = (size: number, weight = 400) => { g.font = `${weight} ${size * k}px ${FONT}`; };
  const width = (s: string) => g.measureText(s).width;
  const wrap = (s: string, maxW: number): string[] => {
    const out: string[] = [];
    for (const para of s.split(/\r?\n/)) {
      let cur = "";
      for (let w of para.split(/\s+/).filter(Boolean)) {
        while (width(w) > maxW && w.length > 1) { // kata terlalu panjang: potong
          let cut = w.length - 1;
          while (cut > 1 && width(w.slice(0, cut)) > maxW) cut--;
          if (cur) { out.push(cur); cur = ""; }
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const t = cur ? cur + " " + w : w;
        if (!cur || width(t) <= maxW) cur = t; else { out.push(cur); cur = w; }
      }
      if (cur) out.push(cur);
    }
    return out;
  };
  const ellipsize = (s: string, maxW: number) => {
    if (width(s) <= maxW) return s;
    let t = s;
    while (t.length > 1 && width(t + "…") > maxW) t = t.slice(0, -1);
    return t + "…";
  };
  const centered = (s: string, size: number, weight: number, lh: number) => {
    font(size, weight);
    g.textAlign = "center";
    for (const l of wrap(s, inner)) { g.fillText(l, W / 2, y + size * k * 0.92); y += lh * k; }
  };
  const row = (l: string, r: string, size: number, wl: number, wr: number, lh: number, x0 = M, x1 = W - M) => {
    font(size, wl); g.textAlign = "left"; g.fillText(l, x0, y + size * k * 0.92);
    font(size, wr); g.textAlign = "right"; g.fillText(r, x1, y + size * k * 0.92);
    y += lh * k;
  };
  const zigzag = (yy: number) => {
    const t = 5 * k;
    g.lineWidth = 2 * k;
    g.beginPath();
    g.moveTo(0, yy + t);
    for (let x = 0, up = true; x <= W + t; x += t, up = !up) g.lineTo(x, up ? yy : yy + t);
    g.stroke();
  };
  const diamond = (cx: number, cy: number, r: number) => {
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fill();
  };
  const ornament = (gap = 8) => {
    y += gap * k;
    const cy = y + 6 * k;
    g.lineWidth = 2 * k;
    g.beginPath();
    g.moveTo(M, cy); g.lineTo(W / 2 - 24 * k, cy);
    g.moveTo(W / 2 + 24 * k, cy); g.lineTo(W - M, cy);
    g.stroke();
    diamond(W / 2, cy, 6 * k);
    diamond(W / 2 - 15 * k, cy, 3 * k);
    diamond(W / 2 + 15 * k, cy, 3 * k);
    y += (12 + gap) * k;
  };
  const rrect = (x: number, yy: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, yy); g.arcTo(x + w, yy, x + w, yy + h, r); g.arcTo(x + w, yy + h, x, yy + h, r);
    g.arcTo(x, yy + h, x, yy, r); g.arcTo(x, yy, x + w, yy, r); g.closePath();
  };

  // ── hiasan tepi atas + logo + kepala toko
  zigzag(y); y += 16 * k;
  if (logo && logo.dotWidth === W) {
    const img = g.createImageData(W, logo.h);
    for (let yy = 0; yy < logo.h; yy++) for (let x = 0; x < W; x++) {
      const on = logo.data[yy * logo.bpr + (x >> 3)] & (0x80 >> (x & 7));
      const o = (yy * W + x) * 4, v = on ? 0 : 255;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, y);
    y += logo.h + 8 * k;
  }
  centered((n.shop.name || "Toko Sayur").toUpperCase(), 27, 800, 31);
  if (n.shop.address.trim()) { y += 2 * k; centered(n.shop.address.trim(), 16, 400, 20); }
  if (n.shop.phone.trim()) { y += 2 * k; centered("Telp/WA  " + n.shop.phone.trim(), 16, 700, 21); }
  ornament(6);

  // ── kotak info nota
  const infoRows: [string, string, boolean][] = [
    ["No. Nota", n.no, false],
    ["Tanggal", `${n.date.getDate()} ${MON[n.date.getMonth()]} ${n.date.getFullYear()}`, false],
    ["Jam", `${p2(n.date.getHours())}.${p2(n.date.getMinutes())}`, false],
    ["Pembeli", n.buyer, true],
  ];
  const pad = 10 * k, rowH = 24 * k;
  const boxTop = y;
  y += pad;
  for (const [l, v, bold] of infoRows) {
    font(16, 400);
    const lw = width(l);
    font(16, bold ? 800 : 600);
    row(l, ellipsize(v, inner - 2 * pad - lw - 14 * k), 16, 400, bold ? 800 : 600, rowH / k, M + pad, W - M - pad);
  }
  y += pad - 4 * k;
  g.lineWidth = 2 * k;
  rrect(M, boxTop, inner, y - boxTop, 8 * k);
  g.stroke();
  y += 10 * k;

  // ── rincian belanja
  font(13, 800);
  g.textAlign = "center";
  const label = "RINCIAN BELANJA";
  const lw2 = width(label), cy2 = y + 8 * k;
  g.fillText(label, W / 2, y + 13 * k * 0.95);
  g.lineWidth = 1.5 * k;
  g.beginPath(); g.moveTo(M, cy2); g.lineTo(W / 2 - lw2 / 2 - 8 * k, cy2); g.moveTo(W / 2 + lw2 / 2 + 8 * k, cy2); g.lineTo(W - M, cy2); g.stroke();
  y += 24 * k;

  if (n.items.length === 0) { font(16, 400); centered("(belum ada barang)", 16, 400, 26); }
  n.items.forEach((i, idx) => {
    const tot = rp(itemTotal(i));
    font(20, 800);
    const tw = width(tot);
    const names = (font(20, 800), wrap(i.name, inner - tw - 12 * k));
    names.forEach((l, li) => {
      font(20, 800); g.textAlign = "left"; g.fillText(l, M, y + 20 * k * 0.92);
      if (li === 0) { g.textAlign = "right"; g.fillText(tot, W - M, y + 20 * k * 0.92); }
      y += 24 * k;
    });
    font(15, 500); g.textAlign = "left";
    g.fillText(`${fmtKg(itemKg(i))}  ×  Rp${num(i.pricePerKg)}/kg`, M, y + 15 * k * 0.92);
    y += 22 * k;
    if (idx < n.items.length - 1) {
      g.lineWidth = 1.5 * k; g.setLineDash([2 * k, 4 * k]);
      g.beginPath(); g.moveTo(M, y + 3 * k); g.lineTo(W - M, y + 3 * k); g.stroke(); g.setLineDash([]);
      y += 9 * k;
    }
  });

  // ── kotak TOTAL (blok hitam, teks putih)
  y += 8 * k;
  const total = rp(notaTotal(n.items));
  let ts = 29;
  font(ts, 800);
  font(18, 800);
  const labelW = width("TOTAL");
  while (ts > 16 && (font(ts, 800), width(total) > inner - 2 * 14 * k - labelW - 14 * k)) ts--;
  const th = 50 * k;
  rrect(M, y, inner, th, 10 * k); g.fill();
  g.fillStyle = "#fff";
  font(18, 800); g.textAlign = "left"; g.fillText("TOTAL", M + 14 * k, y + th / 2 + 6.5 * k);
  font(ts, 800); g.textAlign = "right"; g.fillText(total, W - M - 14 * k, y + th / 2 + ts * k * 0.35);
  g.fillStyle = "#000";
  y += th + 10 * k;

  if (n.paid && n.paid > 0) {
    row("Bayar", rp(n.paid), 18, 600, 700, 26);
    const diff = n.paid - notaTotal(n.items);
    row(diff >= 0 ? "Kembali" : "Kurang", rp(Math.abs(diff)), 19, 800, 800, 28);
  }

  // ── penutup
  ornament(8);
  centered("Terima kasih", 25, 800, 30);
  centered("Selamat berbelanja kembali", 16, 500, 22);
  y += 8 * k;
  centered("Powered by Nuvora Systems", 14, 700, 18);
  centered("www.nuvora-systems.com", 14, 400, 18);
  y += 8 * k;
  zigzag(y);
  y += 5 * k + 16 * k;

  // ── jadikan 1-bit (ambang agak longgar supaya garis tipis tetap tebal di kertas thermal)
  const h = Math.ceil(y);
  const px = g.getImageData(0, 0, W, h).data;
  const bpr = Math.ceil(W / 8);
  const data = new Uint8Array(bpr * h);
  for (let yy = 0; yy < h; yy++) for (let x = 0; x < W; x++) {
    const o = (yy * W + x) * 4;
    const lum = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
    if (lum < 165) data[yy * bpr + (x >> 3)] |= 0x80 >> (x & 7);
  }
  return { dotWidth: W, h, bpr, data };
}
