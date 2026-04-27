import React, { useEffect, useState } from "react";
import { Calculator, CheckCircle2, ClipboardList, FolderOpen, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { hasUserChoice } from "@/services/consentService";
import { isNativeAdsBridgeAvailable } from "@/services/platformService";
import { safeStorageGet, safeStorageSet } from "@/services/persistentStorage";

const WELCOME_STORAGE_KEY = "batiquant_welcome_1_0_1_seen";

const canShowWelcomeNow = (): boolean => {
  // On Android, the native UMP form handles consent outside this React modal.
  // On web, wait until the consent choice is completed to avoid stacking dialogs.
  return isNativeAdsBridgeAvailable() || hasUserChoice();
};

export const WelcomeModal: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (safeStorageGet(WELCOME_STORAGE_KEY) === "1") return;

    const tryOpen = () => {
      if (safeStorageGet(WELCOME_STORAGE_KEY) === "1") return;
      if (!canShowWelcomeNow()) return;
      setOpen(true);
    };

    tryOpen();
    window.addEventListener("consent-updated", tryOpen);

    return () => window.removeEventListener("consent-updated", tryOpen);
  }, []);

  const close = () => {
    safeStorageSet(WELCOME_STORAGE_KEY, "1");
    setOpen(false);
  };

  const start = () => {
    close();
    navigate("/app/calculators");
  };

  if (!open) return null;

  const items = [
    {
      icon: <Calculator size={18} />,
      title: t("welcome.items.calculators.title", { defaultValue: "Calculs chantier" }),
      text: t("welcome.items.calculators.text", {
        defaultValue: "Estimez rapidement vos matériaux et quantités.",
      }),
    },
    {
      icon: <FolderOpen size={18} />,
      title: t("welcome.items.projects.title", { defaultValue: "Projets et chantiers" }),
      text: t("welcome.items.projects.text", {
        defaultValue: "Enregistrez vos résultats et suivez vos dossiers.",
      }),
    },
    {
      icon: <ClipboardList size={18} />,
      title: t("welcome.items.exports.title", { defaultValue: "Devis et sauvegardes" }),
      text: t("welcome.items.exports.text", {
        defaultValue: "Retrouvez, exportez et sauvegardez vos données.",
      }),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                {t("welcome.badge", { defaultValue: "Bienvenue" })}
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                {t("welcome.title", { defaultValue: "Bienvenue dans BatiQuant" })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("welcome.subtitle", {
                  defaultValue:
                    "Calculez vos quantités, organisez vos projets et gardez vos données chantier au même endroit.",
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label={t("common.close", { defaultValue: "Fermer" })}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mt-0.5 rounded-xl bg-white p-2 text-blue-700 shadow-sm">{item.icon}</div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("welcome.skip", { defaultValue: "Ignorer" })}
          </button>
          <button
            type="button"
            onClick={start}
            className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            {t("welcome.start", { defaultValue: "Découvrir les calculs" })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
