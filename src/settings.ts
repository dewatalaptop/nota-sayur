import { useEffect, useState } from "react";
import type { Profile } from "./store";
import type { Paper } from "./lib/escpos";

export const ls = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* abaikan */
    }
  },
};

// Lebar kertas tersimpan per perangkat (printer melekat pada HP/perangkat ini).
// Profil toko (nama, alamat, telp, logo) tersimpan di Firebase agar ikut ke perangkat mana pun.
export function useSettings(profile: Profile) {
  // Kunci baru "paper58": printer pemilik adalah Postech 58 mm, jadi nilai lama (mis. 80 mm) diabaikan.
  const [paper, setPaper] = useState<Paper>(ls.get("paper58", "32") === "48" ? 48 : 32);
  useEffect(() => ls.set("paper58", String(paper)), [paper]);
  // "img" = nota gambar (cantik, default); "txt" = teks polos (cepat, cadangan)
  const [style, setStyle] = useState<"img" | "txt">(ls.get("style", "img") === "txt" ? "txt" : "img");
  useEffect(() => ls.set("style", style), [style]);
  return { shop: profile, paper, setPaper, style, setStyle };
}
export type Settings = ReturnType<typeof useSettings>;
