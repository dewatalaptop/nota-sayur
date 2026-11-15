import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" supaya jalan di GitHub Pages (sub-path /nama-repo/)
export default defineConfig({ base: "./", plugins: [react()] });
