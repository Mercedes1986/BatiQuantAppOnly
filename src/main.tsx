import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { bootstrapPersistentStorage } from "./services/persistentStorage";

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

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

(async () => {
  try {
    await bootstrapPersistentStorage(BUILD_ID);
  } catch {
    // ignore storage bootstrap failures and continue booting the app
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
