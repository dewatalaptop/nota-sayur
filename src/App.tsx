import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { Nota, Product, Profile, delProduct, saveProduct, saveProfile, subNotas, subProducts, subProfile } from "./store";
import { parseNum, rp } from "./lib/calc";
import type { Paper } from "./lib/escpos";
import { fileToLogoDataUrl } from "./lib/logo";
import { NotaEditor, NotaList } from "./NotaScreens";
import { useLogoBitmap } from "./Receipt";
import { Settings, useSettings } from "./settings";
import { btConnect, btConnected, btName, btPrint, btSupported } from "./lib/printer";

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(firebaseAuth, setUser), []);
  if (user === undefined) return <Center>Memuat…</Center>;
  if (!user) return <Login />;
  return <Main user={user} />;
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center p-6 text-center" style={{ color: "var(--text-secondary)" }}>{children}</div>
);

function Login() {
  const [u, setU] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await signInWithEmailAndPassword(firebaseAuth, `${u.trim().toLowerCase()}@nota-sayur.app`, pw); }
    catch (e: any) { setErr(/network/i.test(e?.code ?? "") ? "Tidak ada koneksi internet." : "Username atau password salah."); }
    setBusy(false);
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6 text-center">
      <div className="text-5xl">🥬</div>
      <h1 className="text-2xl font-bold">Nota Sayur</h1>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Masuk untuk membuka nota Anda.</p>
      <input className="input w-full" placeholder="Username" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
      <input className="input w-full" type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button className="btn-primary w-full" disabled={busy || !u || !pw} onClick={submit}>{busy ? "Masuk…" : "Masuk"}</button>
      {err && <p className="text-sm" style={{ color: "var(--error-text)" }}>{err}</p>}
    </div>
  );
}

type Tab = "nota" | "harga" | "atur";

function Main({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("nota");
  const [products, setProducts] = useState<Product[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({ name: "Toko Sayur", phone: "", address: "" });
  const settings = useSettings(profile);
  useEffect(() => subProfile(user.uid, setProfile), [user.uid]);
  useEffect(() => subProducts(user.uid, setProducts), [user.uid]);
  useEffect(() => subNotas(user.uid, setNotas), [user.uid]);
  const open = notas.find((n) => n.id === openId);

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-24">
      <header className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: "var(--bg)" }}>
        <h1 className="text-lg font-bold">🥬 {settings.shop.name}</h1>
      </header>
      <main className="px-4">
        {tab === "nota" && (open ? <NotaEditor uid={user.uid} nota={open} products={products} settings={settings} onBack={() => setOpenId(null)} onGoPrices={() => { setOpenId(null); setTab("harga"); }} />
          : <NotaList uid={user.uid} notas={notas} onOpen={setOpenId} />)}
        {tab === "harga" && <Prices uid={user.uid} products={products} />}
        {tab === "atur" && <SettingsTab settings={settings} user={user} />}
      </main>
      {!open && <nav className="no-print fixed bottom-0 left-0 right-0 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-xl">
          {([["nota", "🧾", "Nota"], ["harga", "🥕", "Harga"], ["atur", "⚙️", "Atur"]] as const).map(([k, i, l]) => (
            <button key={k} onClick={() => { setTab(k); setOpenId(null); }} className="flex-1 py-3 text-sm font-medium" style={{ color: tab === k ? "var(--brand-600)" : "var(--text-secondary)" }}>
              <div className="text-xl">{i}</div>{l}
            </button>
          ))}
        </div>
      </nav>}
    </div>
  );
}

function Prices({ uid, products }: { uid: string; products: Product[] }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const add = () => { const p = parseNum(price); if (!name.trim() || !(p > 0)) return; saveProduct(uid, { name: name.trim(), pricePerKg: p }); setName(""); setPrice(""); };
  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <input className="input w-full" placeholder="Nama sayur (mis. Bayam)" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <input className="input flex-1" inputMode="numeric" placeholder="Harga per kg (mis. 5000)" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn-primary" onClick={add}>Simpan</button>
        </div>
      </div>
      <p className="px-1 text-xs" style={{ color: "var(--text-faint)" }}>Mengubah harga hanya berlaku untuk nota berikutnya; nota lama tetap memakai harga saat dibuat.</p>
      {products.map((p) => (
        <div key={p.id} className="card flex items-center justify-between">
          <span className="font-medium">{p.name}</span>
          <span className="flex items-center gap-3">
            <button className="font-semibold" onClick={() => { const n = prompt(`Harga baru ${p.name} per kg`, String(p.pricePerKg)); const x = n ? parseNum(n) : NaN; if (x > 0) saveProduct(uid, { id: p.id, name: p.name, pricePerKg: x }); }}>{rp(p.pricePerKg)}/kg ✎</button>
            <button style={{ color: "var(--error-text)" }} aria-label="Hapus" onClick={() => confirm(`Hapus ${p.name}?`) && delProduct(uid, p.id)}>✕</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function ShopForm({ uid, profile, paper }: { uid: string; profile: Profile; paper: Paper }) {
  const [d, setD] = useState<Profile>(profile);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // sinkron saat data dari server tiba, tapi jangan menimpa ketikan yang sedang berjalan
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setD(profile); }, [profile, dirty]);
  const edit = (p: Partial<Profile>) => { setDirty(true); setD((x) => ({ ...x, ...p })); setMsg(""); };
  const { url } = useLogoBitmap(d.logo, paper);
  const pick = async (f?: File) => {
    if (!f) return;
    try { edit({ logo: await fileToLogoDataUrl(f) }); } catch (e: any) { setMsg(e.message); }
  };
  const save = async () => {
    setBusy(true);
    try { await saveProfile(uid, { ...d, name: d.name.trim() || "Toko Sayur", phone: d.phone.trim(), address: d.address.trim() }); setDirty(false); setMsg("Tersimpan ✓"); }
    catch { setMsg("Gagal menyimpan. Periksa koneksi internet."); }
    setBusy(false);
  };
  return (
    <div className="card space-y-2">
      <div className="font-medium">Profil usaha (tercetak di nota)</div>
      <label className="text-sm">Nama usaha</label>
      <input className="input w-full" value={d.name} onChange={(e) => edit({ name: e.target.value })} />
      <label className="text-sm">Alamat</label>
      <textarea className="input w-full" rows={2} placeholder="Mis. Pasar Pagi Blok C No. 12" value={d.address} onChange={(e) => edit({ address: e.target.value })} />
      <label className="text-sm">Nomor HP / WhatsApp</label>
      <input className="input w-full" inputMode="tel" placeholder="08xxxxxxxxxx" value={d.phone} onChange={(e) => edit({ phone: e.target.value })} />
      <label className="text-sm">Logo</label>
      <div className="flex items-center gap-3">
        {url ? <img src={url} alt="Logo hitam-putih" style={{ maxWidth: 160, maxHeight: 90, border: "1px solid var(--border)", background: "#fff", borderRadius: 8 }} /> : <div className="text-xs" style={{ color: "var(--text-faint)" }}>Belum ada logo</div>}
        <div className="flex flex-col gap-2">
          <label className="btn-secondary cursor-pointer text-center">{d.logo ? "Ganti" : "Pilih gambar"}<input type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
          {d.logo && <button className="text-sm" style={{ color: "var(--error-text)" }} onClick={() => edit({ logo: undefined })}>Hapus logo</button>}
        </div>
      </div>
      {d.logo && <p className="text-xs" style={{ color: "var(--text-faint)" }}>Logo otomatis diubah ke hitam-putih agar jelas di printer thermal. Gambar kontras tinggi (tulisan/ikon sederhana) hasilnya paling tajam.</p>}
      <button className="btn-primary w-full" disabled={busy || !dirty} onClick={save}>{busy ? "Menyimpan…" : "Simpan profil"}</button>
      {msg && <p className="text-sm" style={{ color: msg.includes("✓") ? "var(--success-text)" : "var(--error-text)" }}>{msg}</p>}
    </div>
  );
}

function SettingsTab({ settings, user }: { settings: Settings; user: User }) {
  const [msg, setMsg] = useState("");
  const [, force] = useState(0);
  return (
    <div className="space-y-3">
      <ShopForm uid={user.uid} profile={settings.shop} paper={settings.paper} />
      <div className="card space-y-2">
        <label className="text-sm font-medium">Lebar kertas printer</label>
        <select className="input w-full" value={settings.paper} onChange={(e) => settings.setPaper(Number(e.target.value) as Paper)}>
          <option value={32}>58 mm (paling umum)</option><option value={48}>80 mm</option>
        </select>
      </div>
      <div className="card space-y-2">
        <div className="font-medium">Printer Bluetooth</div>
        {!btSupported() && <p className="text-sm" style={{ color: "var(--warning-text)" }}>Browser ini tidak mendukung Bluetooth web. Di iPhone, buka aplikasi ini lewat <b>Bluefy</b> (App Store). Safari/Chrome iPhone tidak bisa.</p>}
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{btConnected() ? `Terhubung: ${btName()}` : "Belum terhubung"}</p>
        <button className="btn-primary w-full" onClick={() => btConnect().then((n) => { setMsg(`Terhubung ke ${n}`); force((x) => x + 1); }).catch((e) => setMsg(e.message))}>Cari & sambungkan printer</button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
      <div className="card flex items-center justify-between">
        <span className="text-sm">{user.email?.split("@")[0]}</span>
        <button className="btn-secondary" onClick={() => signOut(firebaseAuth)}>Keluar</button>
      </div>
    </div>
  );
}
