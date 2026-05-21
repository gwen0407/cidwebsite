import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  base: "/",
  build: {
    // Output to public/ at the project root so Vercel serves static assets
    // from the public/ directory alongside the Express server entrypoint.
    outDir: path.resolve(import.meta.dirname, "public"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
