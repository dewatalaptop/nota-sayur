// Pastikan HP pelanggan memakai versi terbaru.
// GitHub Pages menyimpan index.html di cache HP hingga 10 menit, dan aplikasi yang dipasang di layar utama iPhone
// bisa berhari-hari tetap terbuka di latar belakang dengan kode lama. Maka: cek version.json (tanpa cache) saat dibuka,
// saat kembali ke aplikasi, dan tiap 5 menit. Bila ada versi baru:
//  • saat baru dibuka / kembali dari latar belakang → langsung muat ulang (pengguna belum mengetik apa pun);
//  • saat sedang dipakai → tampilkan tombol "Perbarui" (tidak memotong input angka atau sambungan printer).
// Data aman saat dimuat ulang: tulisan yang belum terkirim tersimpan di cache Firestore HP dan dikirim setelahnya.
declare const __BUILD__: string;
export const BUILD: string = typeof __BUILD__ === "string" ? __BUILD__ : "dev";

type Listener = (v: string | null) => void;
let newer: string | null = null;
const listeners = new Set<Listener>();
export const onUpdate = (f: Listener) => { listeners.add(f); f(newer); return () => { listeners.delete(f); }; };

/** Muat ulang ke URL ber-?v= unik → melewati index.html yang tersimpan di cache. */
export function applyUpdate(v = newer || String(Date.now())) {
  try { if (sessionStorage.getItem("ns-upd") === v) return; sessionStorage.setItem("ns-upd", v); } catch { /* mode privat */ }
  const u = new URL(location.href); u.searchParams.set("v", v); location.replace(u.toString());
}

async function check(auto: boolean) {
  if (BUILD === "dev" || !navigator.onLine) return;
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" }); if (!r.ok) return;
    const { v } = (await r.json()) as { v?: string }; if (!v || v === BUILD) return;
    if (auto) { applyUpdate(v); return; }
    if (newer !== v) { newer = v; listeners.forEach((f) => f(v)); }
  } catch { /* sinyal jelek: coba lagi nanti */ }
}

let hiddenAt = 0;
export function startUpdateCheck() {
  check(true);                                                                    // baru dibuka
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    check(Date.now() - hiddenAt > 30_000);                                       // kembali setelah >30 dtk di latar = aman dimuat ulang
  });
  addEventListener("pageshow", (e) => { if ((e as PageTransitionEvent).persisted) check(true); });   // dipulihkan dari bfcache Safari
  addEventListener("online", () => check(false));
  setInterval(() => { if (!document.hidden) check(false); }, 5 * 60_000);
}
