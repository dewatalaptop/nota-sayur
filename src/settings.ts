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
  const [paper, setPaper] = useState<Paper>(ls.get("paper", "32") === "48" ? 48 : 32);
  useEffect(() => ls.set("paper", String(paper)), [paper]);
  return { shop: profile, paper, setPaper };
}
export type Settings = ReturnType<typeof useSettings>;
