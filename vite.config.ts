import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // aceita IPv4/IPv6
    port: 8080, // porta de dev
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(), // só ativa em dev
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // permite importar com "@/..."
    },
  },
}));
