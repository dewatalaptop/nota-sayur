import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, limit } from "firebase/firestore";
import { db } from "./firebase";
import type { NotaItem } from "./lib/calc";

export interface Product { id: string; name: string; pricePerKg: number }
export interface Nota { id: string; buyer: string; items: NotaItem[]; total: number; paid?: number; createdAt?: number; status: "open" | "paid" }

const root = (uid: string, c: string) => collection(db, "notaSayurUsers", uid, c);

export interface Profile { name: string; phone: string; address: string; logo?: string }
export const subProfile = (uid: string, cb: (p: Profile) => void) =>
  onSnapshot(doc(db, "notaSayurUsers", uid, "profile", "main"), (d) => {
    const x = (d.data() ?? {}) as Partial<Profile>;
    cb({ name: x.name ?? "Toko Sayur", phone: x.phone ?? "", address: x.address ?? "", logo: x.logo || undefined });
  });
export const saveProfile = (uid: string, p: Profile) =>
  setDoc(doc(db, "notaSayurUsers", uid, "profile", "main"), { name: p.name, phone: p.phone, address: p.address, logo: p.logo ?? "" });

export const subProducts =(uid: string, cb: (p: Product[]) => void) =>
  onSnapshot(query(root(uid, "products"), orderBy("name")), (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));

// limit(200): batasi baca. Nota lama tetap aman di Firestore.
export const subNotas = (uid: string, cb: (n: Nota[]) => void) =>
  onSnapshot(query(root(uid, "notas"), orderBy("createdAt", "desc"), limit(200)), (s) =>
    cb(s.docs.map((d) => { const x = d.data({ serverTimestamps: "estimate" }) as any; return { id: d.id, ...x, createdAt: x.createdAt?.toMillis?.() }; })));

export const saveProduct = (uid: string, p: Omit<Product, "id"> & { id?: string }) =>
  p.id ? setDoc(doc(root(uid, "products"), p.id), { name: p.name, pricePerKg: p.pricePerKg }) : addDoc(root(uid, "products"), { name: p.name, pricePerKg: p.pricePerKg });
export const delProduct = (uid: string, id: string) => deleteDoc(doc(root(uid, "products"), id));

export const createNota = (uid: string, buyer: string) =>
  addDoc(root(uid, "notas"), { buyer, items: [], total: 0, status: "open", createdAt: serverTimestamp() });
export const patchNota = (uid: string, id: string, data: Partial<Omit<Nota, "id">>) => updateDoc(doc(root(uid, "notas"), id), data as any);
export const delNota = (uid: string, id: string) => deleteDoc(doc(root(uid, "notas"), id));
