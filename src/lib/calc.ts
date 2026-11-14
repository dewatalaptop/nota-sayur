export type Mode = "kg" | "rp";

export interface NotaItem {
  id: string;
  name: string;
  pricePerKg: number; // Rp per kg, snapshot saat nota dibuat
  mode: Mode;
  /** mode "kg": berat (kg). mode "rp": uang pembeli (Rp). */
  value: number;
}

/** Berat (kg) yang didapat pembeli. Dibulatkan ke gram. */
export function itemKg(i: NotaItem): number {
  if (i.mode === "kg") return round3(i.value);
  return i.pricePerKg > 0 ? round3(i.value / i.pricePerKg) : 0;
}

/** Total harga baris, dalam rupiah bulat. */
export function itemTotal(i: NotaItem): number {
  if (i.mode === "rp") return Math.round(i.value);
  return Math.round(i.value * i.pricePerKg);
}

export const notaTotal = (items: NotaItem[]) => items.reduce((s, i) => s + itemTotal(i), 0);

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export function fmtKg(kg: number): string {
  if (kg > 0 && kg < 1) return `${Math.round(kg * 1000)} gram`;
  return `${kg.toLocaleString("id-ID", { maximumFractionDigits: 3 })} kg`;
}

/** Terima "0,5" / "0.5" / "5.000" -> angka. */
export function parseNum(s: string): number {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return NaN;
  // titik sebagai pemisah ribuan jika ada 3 digit setelahnya
  const norm = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}
