import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// base "./" supaya jalan di GitHub Pages (sub-path /nama-repo/)
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { rollupOptions: { input: { main: resolve(__dirname, "index.html"), preview: resolve(__dirname, "preview.html") } } },
});
