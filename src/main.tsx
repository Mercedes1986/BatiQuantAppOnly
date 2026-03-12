import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initConsent } from "./services/consentService";

import "./i18n";

(() => {
  if (typeof window === "undefined") return;
  const { hash, search } = window.location;
  if (hash && hash.startsWith("#/")) {
    const newPath = hash.slice(1);
    window.history.replaceState(null, "", newPath + search);
  }
})();

const BUILD_ID = import.meta.env.VITE_BUILD_ID || "dev";
const BUILD_KEY = "bq_build_id";

const KEEP_KEYS = new Set<string>([
  BUILD_KEY,
  "batiquant_consent",
  "baticalc_consent",
  "i18nextLng",
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

    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // ignore
      }
    }

    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // ignore
      }
    }

    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !KEEP_KEYS.has(key)) keysToDelete.push(key);
    }

    for (const key of keysToDelete) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    localStorage.setItem(BUILD_KEY, BUILD_ID);

    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

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
    window.location.replace(window.location.href);
    return;
  }

  try {
    initConsent();
  } catch {
    // ignore consent boot failures
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();