import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AD_CONFIG, getAdPermission } from "../../config/adsConfig";
import { getAdsMode } from "../../services/consentService";

declare global {
  interface Window {
    adsbygoogle?: any[] & { requestNonPersonalizedAds?: number };
  }
}

interface AdSlotProps {
  slotId: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  layoutKey?: string;
  className?: string;
  label?: string;
  variant?: "content" | "safe";
  minHeight?: number;
}

let adsenseLoadPromise: Promise<void> | null = null;

const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

function findExistingAdSenseScript(): HTMLScriptElement | null {
  if (!isBrowser()) return null;

  const byId = document.getElementById("adsense-script") as HTMLScriptElement | null;
  if (byId) return byId;

  const bySrc = Array.from(document.scripts).find((sc) =>
    (sc as HTMLScriptElement).src?.includes("pagead/js/adsbygoogle.js")
  ) as HTMLScriptElement | undefined;

  return bySrc || null;
}

function isAdSenseProbablyReady(): boolean {
  try {
    return Array.isArray(window.adsbygoogle);
  } catch {
    return false;
  }
}

function ensureAdSenseScriptLoaded(): Promise<void> {
  if (!isBrowser()) return Promise.resolve();
  if (adsenseLoadPromise) return adsenseLoadPromise;

  adsenseLoadPromise = new Promise((resolve, reject) => {
    const existing = findExistingAdSenseScript();

    // ✅ déjà prêt
    if (isAdSenseProbablyReady()) return resolve();

    if (existing) {
      // si déjà marqué loaded
      if ((existing as any)?.dataset?.loaded === "true") return resolve();

      const onLoad = () => {
        try {
          (existing as any).dataset.loaded = "true";
        } catch {}
        resolve();
      };
      const onError = () => reject(new Error("Failed to load AdSense script"));

      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });

      // micro-check
      setTimeout(() => {
        if (isAdSenseProbablyReady()) resolve();
      }, 0);

      return;
    }

    // Fallback : injecter si absent
    const s = document.createElement("script");
    s.id = "adsense-script";
    s.async = true;

    const client = encodeURIComponent(AD_CONFIG.PUBLISHER_ID);
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.crossOrigin = "anonymous";

    s.onload = () => {
      try {
        s.dataset.loaded = "true";
      } catch {}
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load AdSense script"));

    document.head.appendChild(s);
  });

  return adsenseLoadPromise;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  slotId,
  format = "auto",
  layoutKey,
  className = "",
  label,
  variant = "content",
  minHeight = 280,
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  // ✅ ref stable, large type (évite HTMLModElement / lib.dom)
  const adRef = useRef<HTMLElement | null>(null);

  const [shouldRender, setShouldRender] = useState(false);
  const [adsMode, setAdsMode] = useState<"personalized" | "limited">("limited");
  const [mountNonce, setMountNonce] = useState(0);

  const isDev = import.meta.env.DEV;

  const safeStyles =
    variant === "safe" ? "my-12 py-4 bg-slate-50/50 rounded-xl" : "my-8";

  const effectiveLabel =
    label ?? t("ads.label", { defaultValue: "Publicité" });

  // 1) Permissions par route
  useEffect(() => {
    const permission = getAdPermission(location.pathname);

    if (permission === "deny") return setShouldRender(false);
    if (permission === "safe_only" && variant !== "safe") return setShouldRender(false);

    setShouldRender(true);
  }, [location.pathname, variant]);

  // 2) Consent => mode pub (personalized vs limited)
  useEffect(() => {
    if (!isBrowser()) return;

    const update = () => {
      const mode = getAdsMode();
      setAdsMode(mode);
      // force remount pour re-push proprement si bascule
      setMountNonce((n) => n + 1);
    };

    update();
    const handler = () => update();

    window.addEventListener("consent-updated", handler as EventListener);
    return () => window.removeEventListener("consent-updated", handler as EventListener);
  }, []);

  const slotKey = useMemo(
    () => `${slotId}:${mountNonce}:${location.pathname}`,
    [slotId, mountNonce, location.pathname]
  );

  // 3) Push AdSense
  useEffect(() => {
    if (isDev) return;
    if (!isBrowser()) return;
    if (!shouldRender) return;

    const el = adRef.current;
    if (!el) return;

    // éviter double push sur même instance
    const ds = (el as any).dataset || {};
    if (ds.bqPushed === "true") return;
    ds.bqPushed = "true";
    (el as any).dataset = ds;

    let cancelled = false;

    // ✅ définir NPA AVANT tout push
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = adsMode === "personalized" ? 0 : 1;
    } catch {}

    ensureAdSenseScriptLoaded()
      .then(() => {
        if (cancelled) return;
        if (!adRef.current) return;

        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.requestNonPersonalizedAds = adsMode === "personalized" ? 0 : 1;
          window.adsbygoogle.push({});
        } catch (e) {
          try {
            if (adRef.current) (adRef.current as any).dataset.bqPushed = "false";
          } catch {}
          console.error("AdSense push error", e);
        }
      })
      .catch((e) => {
        try {
          if (adRef.current) (adRef.current as any).dataset.bqPushed = "false";
        } catch {}
        console.error(e);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldRender, adsMode, slotKey, isDev]);

  if (!isDev && !shouldRender) return null;

  return (
    <div className={`w-full flex flex-col items-center print:hidden ${safeStyles} ${className}`}>
      <span className="text-[10px] text-slate-300 uppercase tracking-widest mb-2 select-none">
        {effectiveLabel}
      </span>

      <div
        className="w-full flex items-center justify-center overflow-hidden relative bg-white/50"
        style={{ minHeight }}
      >
        {isDev ? (
          <div
            className="flex flex-col items-center justify-center text-slate-400 p-4 text-center border-2 border-dashed border-slate-200 w-full rounded-lg"
            style={{ height: minHeight }}
          >
            <span className="font-bold text-slate-500">
              {t("ads.dev.title", { defaultValue: "Emplacement pub" })}: {variant}
            </span>
            <span className="text-xs mt-1 font-mono">ID: {slotId}</span>
            <span className="text-xs">
              {t("ads.dev.format", { defaultValue: "Format" })}: {format}
            </span>
            <span className="text-[10px] mt-2 text-amber-500 bg-amber-50 px-2 py-1 rounded">
              {t("ads.dev.only", { defaultValue: "Visible en Dev Mode uniquement" })}
            </span>
            <span className="text-[10px] mt-2 text-slate-400">
              {t("ads.dev.mode", { defaultValue: "Mode pub" })}:{" "}
              <span className="font-mono">{adsMode}</span>
            </span>
          </div>
        ) : (
          <ins
            key={slotKey}
            ref={(node) => {
              adRef.current = node as unknown as HTMLElement | null;
            }}
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight }}
            data-ad-client={AD_CONFIG.PUBLISHER_ID}
            data-ad-slot={slotId}
            data-ad-format={format}
            {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
};