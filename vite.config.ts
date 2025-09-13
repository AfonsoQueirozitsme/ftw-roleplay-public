// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: "/",                         // importante p/ produção (Vercel)
  server: {
    host: true,                      // aceita 0.0.0.0 e :: (mais compatível que "::")
    port: 8080,
  },
  preview: {
    port: 8080,                      // opcional: manter a mesma porta no preview
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",                  // default do Vite, só para ficar explícito
  },
}));
