import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Nomor versi per build: ditanam di kode (__BUILD__) dan ditulis ke dist/version.json.
// Aplikasi membandingkan keduanya agar HP pelanggan selalu memuat versi terbaru (lihat src/lib/update.ts).
const BUILD = process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36);
const versionFile = (): Plugin => ({
  name: "version-file",
  apply: "build",
  generateBundle() { this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ v: BUILD }) }); },
});

// base "./" supaya jalan di GitHub Pages (sub-path /nama-repo/)
export default defineConfig({ base: "./", define: { __BUILD__: JSON.stringify(BUILD) }, plugins: [react(), versionFile()] });
