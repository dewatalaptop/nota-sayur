import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

// Proyek Firebase bersama (Spark/gratis). Login: username+password (email sintetis @nota-sayur.app).
const firebaseApp = initializeApp({
  apiKey: "AIzaSyCiBe6t2_26DflR3W7TbDf4HwDI5Hh0TI4",
  authDomain: "ai-app-builder-7bf8e.firebaseapp.com",
  projectId: "ai-app-builder-7bf8e",
});

export const firebaseAuth = getAuth(firebaseApp);
// Cache offline: pasar sering sinyal jelek; baca dari cache = hemat kuota baca Firestore.
export const db = initializeFirestore(firebaseApp, {
  // Beberapa browser iPhone (mis. Bluefy) memblokir koneksi streaming Firestore -> tulisan menumpuk
  // di HP dan tidak pernah sampai ke server. Deteksi otomatis + cadangan long-polling mengatasinya.
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
});
