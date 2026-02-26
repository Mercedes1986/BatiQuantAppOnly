import React, { useEffect, useRef, useState } from "react";
import { getConsent, setConsentChoice } from "../../services/consentService";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const openIfNeeded = () => {
      const c = getConsent();
      // visible si aucun choix explicite
      if (c.choice === "unknown") setIsVisible(true);
    };

    // petit délai pour éviter flash
    timerRef.current = window.setTimeout(() => openIfNeeded(), 800);

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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-in slide-in-from-bottom-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 md:flex md:items-center md:justify-between">
        <div className="mb-4 md:mb-0 md:mr-6">
          <div className="flex items-center mb-2">
            <ShieldCheck className="text-blue-600 mr-2" size={20} />
            <h3 className="font-bold text-slate-800">Votre vie privée</h3>
          </div>

          <p className="text-sm text-slate-600 leading-snug">
            Nous utilisons des technologies publicitaires. Vous pouvez accepter la
            personnalisation (meilleure pertinence) ou continuer avec des annonces
            non personnalisées.
            <Link to="/legal/privacy" className="text-blue-600 underline ml-1">
              En savoir plus
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
          <Link
            to="/legal/privacy"
            className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors inline-flex items-center justify-center"
          >
            <SlidersHorizontal size={16} className="mr-2" />
            Personnaliser
          </Link>

          <button
            onClick={handleDecline}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Refuser
          </button>

          <button
            onClick={handleAccept}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};