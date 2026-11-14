import { itemKg, itemTotal, parseNum, fmtKg, notaTotal } from "./calc.ts";
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } };
const it = (mode: "kg" | "rp", value: number) => ({ id: "1", name: "Bayam", pricePerKg: 5000, mode, value });
eq(itemKg(it("rp", 1000)), 0.2, "1000 rupiah = 0.2 kg");
eq(itemTotal(it("rp", 1000)), 1000, "rp total");
eq(itemKg(it("kg", 1.5)), 1.5, "kg");
eq(itemTotal(it("kg", 1.5)), 7500, "1.5 kg total");
eq(itemTotal({ ...it("kg", 0.333), pricePerKg: 7000 }), 2331, "rounding");
eq(notaTotal([it("rp", 1000), it("kg", 2)]), 11000, "sum");
eq(parseNum("0,5"), 0.5, "koma"); eq(parseNum("5.000"), 5000, "ribuan"); eq(parseNum("2.5"), 2.5, "titik desimal");
eq(fmtKg(0.2), "200 gram", "gram");
console.log("calc OK");

import { notaLines, notaText, escposBytes, ATTR_2 } from "./escpos.ts";
for (const w of [32, 48] as const) {
  const n = {
    shop: { name: "Toko Sayur Segar Bu Ayu Dyah Makmur Jaya", phone: "081234567890", address: "Pasar Pagi Blok C No. 12, Kelurahan Sukamaju, Kota Contoh" },
    buyer: "Ibu Siti Rahmawati Binti Abdullah", date: new Date(2026, 10, 14, 9, 5), no: "A1B2C",
    items: [{ id: "1", name: "Bayam", pricePerKg: 5000, mode: "rp" as const, value: 1000 }, { id: "2", name: "Kangkung organik hidroponik super", pricePerKg: 12500, mode: "kg" as const, value: 1.75 }],
    paid: 50000,
  };
  const L = notaLines(n, w);
  for (const l of L) eq(l.t.length <= w, true, `lebar ${w}: "${l.t}"`);
  eq(L[L.length - 1].t, ATTR_2, "atribusi");
  eq(escposBytes(n, w).length > 100, true, "escpos");
  if (w === 32) console.log(notaText(n, w));
}
console.log("layout OK");
