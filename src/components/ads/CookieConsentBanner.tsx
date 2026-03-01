// src/components/ads/CookieConsentBanner.tsx
import React, { useEffect, useRef, useState } from "react";
import { getConsent, setConsentChoice, openConsent } from "../../services/consentService";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CookieConsentBanner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const openIfNeeded = () => {
      const c = getConsent();
      if (c.choice === "unknown") setIsVisible(true);
    };

    timerRef.current = window.setTimeout(openIfNeeded, 800);

    const onOpen = () => setIsVisible(true);
    window.addEventListener("consent-open", onOpen as EventListener);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("consent-open", onOpen as EventListener);
    };
  }, []);

  const handleAccept = () => {
    setConsentChoice("accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsentChoice("refused");
    setIsVisible(false);
  };

  const handleCustomize = () => {
    // ✅ app-only : open Settings
    setIsVisible(false);
    try {
      openConsent();
    } catch {
      // ignore
    }
    navigate("/app/settings");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-in slide-in-from-bottom-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 md:flex md:items-center md:justify-between">
        <div className="mb-4 md:mb-0 md:mr-6">
          <div className="flex items-center mb-2">
            <ShieldCheck className="text-blue-600 mr-2" size={20} />
            <h3 className="font-extrabold text-slate-800">
              {t("consent.title", { defaultValue: "Your privacy" })}
            </h3>
          </div>

          <p className="text-sm text-slate-600 leading-snug">
            {t("consent.text", {
              defaultValue:
                "We use advertising technologies. You can accept personalization (more relevant ads) or continue with non-personalized ads.",
            })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
          <button
            onClick={handleCustomize}
            className="px-4 py-2.5 text-sm font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors inline-flex items-center justify-center"
            type="button"
          >
            <SlidersHorizontal size={16} className="mr-2" />
            {t("consent.customize", { defaultValue: "Customize" })}
          </button>

          <button
            onClick={handleDecline}
            className="px-4 py-2.5 text-sm font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            type="button"
          >
            {t("consent.refuse", { defaultValue: "Decline" })}
          </button>

          <button
            onClick={handleAccept}
            className="px-6 py-2.5 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
            type="button"
          >
            {t("consent.accept", { defaultValue: "Accept" })}
          </button>
        </div>
      </div>
    </div>
  );
};