// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  // Apenas adiciona componentTagger em desenvolvimento local se disponível
  if (mode === "development") {
    try {
      const { componentTagger } = require("lovable-tagger");
      plugins.push(componentTagger());
    } catch {
      // lovable-tagger não está disponível (ex: em produção)
      // Ignora silenciosamente
    }
  }

  return {
    base: "/",                         // importante p/ produção (Vercel)
    server: {
      host: true,                      // aceita 0.0.0.0 e :: (mais compatível que "::")
      port: 8080,
    },
    preview: {
      port: 8080,                      // opcional: manter a mesma porta no preview
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "dist",                  // default do Vite, só para ficar explícito
    },
  };
});
