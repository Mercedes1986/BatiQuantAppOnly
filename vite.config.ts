// vite.config.ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    server: {
      port: 3001,          // ✅ 2ᵉ projet (3000 déjà utilisé)
      strictPort: true,    // ✅ n’essaie pas un autre port sans te le dire
      host: "0.0.0.0",
      open: false,
    },

    plugins: [react()],

    // ⚠️ Ne jamais exposer de clé serveur dans le bundle front.
    define: {},

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    build: {
      // ✅ En prod: pas de sourcemaps (perf + sécurité)
      sourcemap: false,

      // ✅ warnings moins agressifs
      chunkSizeWarningLimit: 900,

      // ✅ inline petits assets (évite requêtes inutiles)
      assetsInlineLimit: 4096,

      // ✅ IMPORTANT: on laisse Rollup/Vite gérer le chunking
      rollupOptions: {
        output: {
          // pas de manualChunks
        },
      },

      // ✅ optionnel: compat plus large (au cas où)
      // target: "es2019",
    },

    preview: {
      port: 4174,         // ✅ optionnel: évite conflit si tu previews aussi l’autre projet
      host: "0.0.0.0",
      strictPort: true,
    },
  };
});