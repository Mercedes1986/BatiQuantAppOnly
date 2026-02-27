// src/main.tsx
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initConsent } from "./services/consentService";

// ✅ i18n boot (doit être importé AVANT le render)
import "./i18n";

// ✅ Migration : anciens liens en /#/xxx -> /xxx (HashRouter -> BrowserRouter)
(() => {
  if (typeof window === "undefined") return;
  const { hash, search } = window.location;
  if (hash && hash.startsWith("#/")) {
    const newPath = hash.slice(1);
    window.history.replaceState(null, "", newPath + search);
  }
})();

/**
 * ✅ Purge 1 seule fois par version de build, puis reload.
 * IMPORTANT: ne pas effacer certains keys (build + consentement),
 * sinon le bandeau revient à chaque déploiement et tu perds du revenu.
 */
const BUILD_ID = import.meta.env.VITE_BUILD_ID || "dev";
const BUILD_KEY = "bq_build_id";

// ✅ clés à ne JAMAIS purger
const KEEP_KEYS = new Set<string>([
  BUILD_KEY,
  "batiquant_consent",
  "baticalc_consent",
  "i18nextLng", // ✅ language mémorisée par i18next
]);

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof localStorage !== "undefined";

async function purgeSiteDataOncePerBuild(): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const prev = localStorage.getItem(BUILD_KEY);
    if (prev === BUILD_ID) return false;

    // 1) purge caches + SW
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }

    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {}
    }

    // 2) purge localStorage (sélectif)
    try {
      const keysToDelete: string[] = [];

      // IMPORTANT: on ne modifie pas localStorage pendant l'itération de length
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !KEEP_KEYS.has(k)) keysToDelete.push(k);
      }

      for (const k of keysToDelete) {
        try {
          localStorage.removeItem(k);
        } catch {}
      }

      // réécrit le build key en dernier
      localStorage.setItem(BUILD_KEY, BUILD_ID);
    } catch {
      // si localStorage est bloqué, on évite de casser l'app
      return false;
    }

    // 3) purge sessionStorage (ok)
    try {
      sessionStorage.clear();
    } catch {}

    return true;
  } catch {
    return false;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

(async () => {
  const didPurge = await purgeSiteDataOncePerBuild();

  if (didPurge) {
    // reload "propre" une seule fois
    window.location.replace(window.location.href);
    return;
  }

  // ✅ Init consent au boot :
  // - pousse l'état dans dataLayer
  // - charge GTM seulement si déjà accepté
  // (ne casse rien si GTM absent)
  try {
    initConsent();
  } catch {}

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();