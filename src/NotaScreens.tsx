import { useEffect, useMemo, useState } from "react";
import { Nota, Product, createNota, delNota, patchNota } from "./store";
import { Mode, NotaItem, fmtKg, itemKg, itemTotal, notaTotal, parseNum, rp } from "./lib/calc";
import { NotaPrint, escposBytes, notaText } from "./lib/escpos";
import { emojiFor } from "./lib/emoji";
import { btConnect, btConnected, btName, btPrint, btSupported } from "./lib/printer";
import { Receipt, useLogoBitmap } from "./Receipt";
import { Settings, ls } from "./settings";

/* ───────────────────────── Daftar nota ───────────────────────── */

export function NotaList({ uid, notas, onOpen }: { uid: string; notas: Nota[]; onOpen: (id: string) => void }) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date().toDateString();
  const todays = notas.filter((n) => n.createdAt && new Date(n.createdAt).toDateString() === today);
  const sum = todays.reduce((s, n) => s + n.total, 0);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    const buyer = name.trim() || `Pembeli ${todays.length + 1}`;
    try {
      const r = await createNota(uid, buyer);
      setName("");
      onOpen(r.id);
    } finally {
      setBusy(false);
    }
  };
  const shown = notas.filter((n) => n.buyer.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="text-base font-semibold">Ada pembeli baru?</div>
        <input
          className="input w-full"
          placeholder="Nama pembeli (boleh dikosongkan)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn-big w-full" disabled={busy} onClick={add}>
          ＋ Buat Nota Baru
        </button>
      </div>

      {todays.length > 0 && (
        <div className="card flex items-center justify-between" style={{ background: "var(--brand-50)", borderColor: "transparent" }}>
          <div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Hari ini</div>
            <div className="text-base font-semibold">{todays.length} nota</div>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--brand-700)" }}>{rp(sum)}</div>
        </div>
      )}

      {notas.length > 0 && <div className="px-1 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Nota tersimpan — ketuk untuk membuka</div>}
      {notas.length > 6 && <input className="input w-full" placeholder="🔍 Cari nama pembeli…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {notas.length === 0 && (
        <div className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
          <div className="text-5xl">🧾</div>
          <p className="mt-2 text-base">Belum ada nota.<br />Tekan tombol hijau di atas untuk mulai.</p>
        </div>
      )}
      {shown.map((n) => (
        <button key={n.id} className="card flex w-full items-center justify-between gap-3 text-left" onClick={() => onOpen(n.id)}>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{n.buyer}</div>
            <div className="text-sm" style={{ color: "var(--text-faint)" }}>
              {n.createdAt ? new Date(n.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : ""} · {n.items.length} barang
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-base font-bold">{rp(n.total)}</div>
            <span className="text-sm" style={{ color: n.status === "paid" ? "var(--success-text)" : "var(--warning-text)" }}>
              {n.status === "paid" ? "✓ Lunas" : "Belum lunas"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Papan angka (isi jumlah) ───────────────────────── */

const RP_CHIPS = [1000, 2000, 3000, 5000, 10000];
const KG_CHIPS: [string, string][] = [["¼ kg", "0,25"], ["½ kg", "0,5"], ["1 kg", "1"], ["2 kg", "2"], ["5 kg", "5"]];

function AmountSheet({
  product, initial, onSave, onDelete, onClose,
}: {
  product: { name: string; pricePerKg: number };
  initial?: { mode: Mode; value: number };
  onSave: (mode: Mode, value: number) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initial?.mode ?? (ls.get("lastMode", "rp") === "kg" ? "kg" : "rp"));
  const [s, setS] = useState(initial ? String(initial.value).replace(".", ",") : "");
  const v = parseNum(s || "0");
  const ok = v > 0;

  const result = useMemo(() => {
    if (!ok) return null;
    const it: NotaItem = { id: "", name: product.name, pricePerKg: product.pricePerKg, mode, value: v };
    return mode === "rp" ? { big: fmtKg(itemKg(it)), small: `untuk uang ${rp(v)}` } : { big: rp(itemTotal(it)), small: `untuk ${fmtKg(v)}` };
  }, [ok, mode, v, product]);

  const press = (k: string) => {
    if (k === "⌫") return setS((x) => x.slice(0, -1));
    if (k === ",") return setS((x) => (mode === "kg" && !x.includes(",") ? (x === "" ? "0," : x + ",") : x));
    if (k === "000") return setS((x) => (x === "" || x.length > 6 ? x : x + "000"));
    setS((x) => {
      if (x === "0") x = ""; // hindari 05
      if (mode === "rp") return x.length >= 9 ? x : x + k;
      const dec = x.split(",")[1];
      if (dec !== undefined && dec.length >= 3) return x;
      return x.length >= 7 ? x : x + k;
    });
  };
  const chooseMode = (m: Mode) => { if (m !== mode) { setMode(m); setS(""); } };
  const shown = s === "" ? "0" : mode === "rp" ? Number(s).toLocaleString("id-ID") : s;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", mode === "kg" ? "," : "000", "0", "⌫"];

  const save = () => { if (!ok) return; ls.set("lastMode", mode); onSave(mode, v); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgb(0 0 0 / 0.45)" }} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{emojiFor(product.name)}</span>
            <div>
              <div className="text-lg font-bold leading-tight">{product.name}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{rp(product.pricePerKg)} per kg</div>
            </div>
          </div>
          <button className="icon-btn" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className={`seg ${mode === "rp" ? "seg-on" : ""}`} onClick={() => chooseMode("rp")}>💵 Pakai uang<small>pembeli beli Rp…</small></button>
          <button className={`seg ${mode === "kg" ? "seg-on" : ""}`} onClick={() => chooseMode("kg")}>⚖️ Pakai berat<small>pembeli beli … kg</small></button>
        </div>

        <div className="mt-3 rounded-2xl p-3 text-center" style={{ background: "var(--bg)" }}>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{mode === "rp" ? "Uang pembeli" : "Berat (kg)"}</div>
          <div className="text-4xl font-bold tracking-tight" style={{ color: s ? "var(--text)" : "var(--text-faint)" }}>
            {mode === "rp" ? "Rp " : ""}{shown}{mode === "kg" ? " kg" : ""}
          </div>
          <div className="mt-1 min-h-[44px]">
            {result ? (
              <>
                <div className="text-2xl font-bold" style={{ color: "var(--brand-700)" }}>= {result.big}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.small}</div>
              </>
            ) : (
              <div className="pt-2 text-sm" style={{ color: "var(--text-faint)" }}>Ketuk angka di bawah, atau pilih cepat ↓</div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {mode === "rp"
            ? RP_CHIPS.map((c) => <button key={c} className="chip" onClick={() => setS(String(c))}>{c.toLocaleString("id-ID")}</button>)
            : KG_CHIPS.map(([l, val]) => <button key={l} className="chip" onClick={() => setS(val)}>{l}</button>)}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {keys.map((k) => <button key={k} className="key" onClick={() => press(k)} aria-label={k === "⌫" ? "Hapus angka" : k}>{k}</button>)}
        </div>

        <button className="btn-big mt-3 w-full" disabled={!ok} onClick={save}>{initial ? "✓ Simpan Perubahan" : "＋ Tambahkan ke Nota"}</button>
        {onDelete && <button className="mt-2 w-full py-3 text-base font-semibold" style={{ color: "var(--error-text)" }} onClick={onDelete}>🗑 Hapus barang ini</button>}
      </div>
    </div>
  );
}

/* ───────────────────────── Layar nota ───────────────────────── */

export function NotaEditor({
  uid, nota, products, settings, onBack, onGoPrices,
}: {
  uid: string; nota: Nota; products: Product[]; settings: Settings; onBack: () => void; onGoPrices: () => void;
}) {
  const [picking, setPicking] = useState<Product | null>(null);
  const [editing, setEditing] = useState<NotaItem | null>(null);
  const [q, setQ] = useState("");
  const [buyer, setBuyer] = useState(nota.buyer);
  const [paid, setPaid] = useState(nota.paid ? String(nota.paid) : "");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [printed, setPrinted] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => setBuyer(nota.buyer), [nota.buyer]);

  const total = notaTotal(nota.items);
  const paidN = parseNum(paid);
  const logo = useLogoBitmap(settings.shop.logo, settings.paper);
  const printData: NotaPrint = {
    shop: settings.shop, buyer: nota.buyer, date: nota.createdAt ? new Date(nota.createdAt) : new Date(),
    no: nota.id.slice(0, 5).toUpperCase(), items: nota.items, paid: paidN > 0 ? paidN : undefined,
  };

  const save = (items: NotaItem[]) => patchNota(uid, nota.id, { items, total: notaTotal(items) });
  const flash = (t: string, ok = true) => { setMsg({ t, ok }); };

  const printBt = async () => {
    setMsg(null);
    if (nota.items.length === 0) return flash("Belum ada barang di nota ini. Ketuk sayur di atas dulu.", false);
    if (!btSupported()) return flash("Cetak Bluetooth tidak jalan di browser ini. Buka lewat aplikasi Bluefy. Atau pakai tombol “Cetak lewat AirPrint” atau “Kirim nota” di bawah.", false);
    setPrinting(true);
    try {
      if (!btConnected()) await btConnect();
      await btPrint(escposBytes(printData, settings.paper, logo.bm));
      setPrinted(true);
      flash("Nota sudah dikirim ke printer ✓");
    } catch (e: any) {
      flash(e.message || "Gagal mencetak. Pastikan printer menyala dan dekat.", false);
    }
    setPrinting(false);
  };
  const share = async () => {
    try {
      const t = notaText(printData, settings.paper);
      if (navigator.share) await navigator.share({ text: t });
      else { await navigator.clipboard.writeText(t); flash("Nota disalin ✓"); }
    } catch { /* dibatalkan */ }
  };

  const shown = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const itemProduct = (i: NotaItem) => ({ name: i.name, pricePerKg: i.pricePerKg });

  return (
    <div style={{ paddingBottom: 170 }} className="space-y-4">
      <div className="no-print flex items-center gap-2">
        <button className="back-btn" onClick={onBack}>← Kembali</button>
        <span className="flex-1" />
        <button className="px-2 py-2 text-base" style={{ color: "var(--error-text)" }} onClick={() => confirm(`Hapus nota ${nota.buyer}?`) && delNota(uid, nota.id).then(onBack)}>🗑 Hapus nota</button>
      </div>

      <div className="no-print card">
        <label className="text-sm" style={{ color: "var(--text-secondary)" }}>Nama pembeli</label>
        <input
          className="input w-full text-lg font-semibold"
          value={buyer}
          onChange={(e) => setBuyer(e.target.value)}
          onBlur={() => { const b = buyer.trim() || nota.buyer; setBuyer(b); if (b !== nota.buyer) patchNota(uid, nota.id, { buyer: b }); }}
        />
      </div>

      {products.length === 0 ? (
        <div className="no-print card space-y-3 text-center">
          <div className="text-4xl">🥕</div>
          <p className="text-base">Daftar sayur masih kosong. Isi dulu nama sayur dan harganya.</p>
          <button className="btn-big w-full" onClick={onGoPrices}>Isi Daftar Harga</button>
        </div>
      ) : (
        <div className="no-print space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="step">1</span>
            <span className="text-base font-semibold">Ketuk sayur yang dibeli</span>
          </div>
          {products.length > 9 && <input className="input w-full" placeholder="🔍 Cari sayur…" value={q} onChange={(e) => setQ(e.target.value)} />}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((p) => (
              <button key={p.id} className="tile" onClick={() => { setMsg(null); setPrinted(false); setPicking(p); }}>
                <span className="text-3xl">{emojiFor(p.name)}</span>
                <span className="text-base font-semibold leading-tight">{p.name}</span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{rp(p.pricePerKg)}/kg</span>
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="px-1 text-sm" style={{ color: "var(--text-faint)" }}>Sayur tidak ditemukan.</p>}
        </div>
      )}

      <div className="no-print space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="step">2</span>
          <span className="text-base font-semibold">Belanjaan ({nota.items.length})</span>
        </div>
        {nota.items.length === 0 ? (
          <div className="card text-center text-base" style={{ color: "var(--text-faint)" }}>Belum ada barang. Ketuk sayur di atas.</div>
        ) : (
          <>
            {nota.items.map((i) => (
              <button key={i.id} className="card flex w-full items-center gap-3 text-left" onClick={() => setEditing(i)}>
                <span className="text-2xl">{emojiFor(i.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{i.name}</span>
                  <span className="block text-sm" style={{ color: "var(--text-secondary)" }}>{fmtKg(itemKg(i))} · {rp(i.pricePerKg)}/kg</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-base font-bold">{rp(itemTotal(i))}</span>
                  <span className="block text-xs" style={{ color: "var(--brand-600)" }}>ubah ✎</span>
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="no-print card space-y-2">
        <div className="text-base font-semibold">Kembalian <span className="text-sm font-normal" style={{ color: "var(--text-faint)" }}>(boleh dilewati)</span></div>
        <input
          className="input w-full"
          inputMode="numeric"
          placeholder="Uang dari pembeli, mis. 50000"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          onBlur={() => patchNota(uid, nota.id, { paid: paidN > 0 ? paidN : 0 })}
        />
        {paidN > 0 && (
          <div className="flex justify-between text-lg font-bold" style={{ color: paidN >= total ? "var(--success-text)" : "var(--error-text)" }}>
            <span>{paidN >= total ? "Kembalian" : "Uang kurang"}</span>
            <span>{rp(Math.abs(paidN - total))}</span>
          </div>
        )}
      </div>

      <div className="no-print">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="step">3</span>
          <span className="text-base font-semibold">Nota seperti ini yang akan tercetak</span>
        </div>
      </div>
      <Receipt data={printData} paper={settings.paper} logoUrl={logo.url} />

      <div className="no-print card space-y-2">
        <div className="text-base font-semibold">Cara lain</div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={() => window.print()}>🖨️ Cetak lewat AirPrint</button>
          <button className="btn-secondary" onClick={share}>📤 Kirim nota (WhatsApp, dll)</button>
        </div>
        <button className="btn-secondary w-full" onClick={() => patchNota(uid, nota.id, { status: nota.status === "paid" ? "open" : "paid", paid: paidN > 0 ? paidN : 0 })}>
          {nota.status === "paid" ? "Ubah jadi Belum lunas" : "✓ Tandai Lunas"}
        </button>
      </div>

      {/* Bilah bawah: selalu terlihat — total + tombol cetak */}
      <div className="no-print bottombar">
        <div className="mx-auto max-w-xl">
          {msg && (
            <div className="mb-2 rounded-xl p-3 text-sm font-medium" style={{ background: msg.ok ? "var(--success-bg)" : "var(--error-bg)", color: msg.ok ? "var(--success-text)" : "var(--error-text)" }}>
              {msg.t}
            </div>
          )}
          <div className="mb-2 flex items-end justify-between">
            <div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Total belanja</div>
              <div className="text-3xl font-extrabold leading-none">{rp(total)}</div>
            </div>
            <div className="text-right text-xs" style={{ color: "var(--text-faint)" }}>
              {btConnected() ? `🟢 Printer: ${btName()}` : btSupported() ? "Printer belum tersambung" : "Bluetooth: pakai Bluefy"}
            </div>
          </div>
          {printed ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={printBt}>🖨️ Cetak lagi</button>
              <button className="btn-big" onClick={onBack}>＋ Nota Baru</button>
            </div>
          ) : (
            <button className="btn-big w-full" disabled={printing} onClick={printBt}>{printing ? "Mencetak…" : "🖨️ Cetak Nota"}</button>
          )}
        </div>
      </div>

      {picking && (
        <AmountSheet
          product={picking}
          onClose={() => setPicking(null)}
          onSave={(mode, value) => {
            save([...nota.items, { id: crypto.randomUUID(), name: picking.name, pricePerKg: picking.pricePerKg, mode, value }]);
            setPicking(null);
          }}
        />
      )}
      {editing && (
        <AmountSheet
          product={itemProduct(editing)}
          initial={{ mode: editing.mode, value: editing.value }}
          onClose={() => setEditing(null)}
          onSave={(mode, value) => { save(nota.items.map((x) => (x.id === editing.id ? { ...x, mode, value } : x))); setEditing(null); setPrinted(false); }}
          onDelete={() => { save(nota.items.filter((x) => x.id !== editing.id)); setEditing(null); setPrinted(false); }}
        />
      )}
    </div>
  );
}
