import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, Shield, HelpCircle, HardDrive, Download, Upload, AlertTriangle, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { exportAppData, importAppData } from "../services/materialsService";
import { CompanyProfileForm } from "../components/documents/CompanyProfileForm";
import { getSettings, saveSettings } from "../services/storage";

type SettingsTab = "app" | "company";
type Currency = "EUR" | "USD" | "CAD" | "CHF";

const getAppVersion = () => {
  try {
    const v = String((import.meta as any)?.env?.VITE_APP_VERSION || "").trim();
    if (v) return `BatiQuant v${v}`;
    return (import.meta as any)?.env?.DEV ? "BatiQuant (dev)" : "BatiQuant";
  } catch {
    return "BatiQuant";
  }
};

const currencyToSymbol = (c: Currency): string => {
  if (c === "EUR") return "€";
  if (c === "USD") return "$";
  if (c === "CAD") return "$";
  if (c === "CHF") return "CHF";
  return "€";
};

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("app");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [isImporting, setIsImporting] = useState(false);

  const versionLabel = useMemo(() => getAppVersion(), []);

  useEffect(() => {
    try {
      const s = getSettings();
      // ton UserSettings actuel stocke currency comme symbole ("€") => on remappe en code
      const sym = s.currency || "€";
      const code: Currency =
        sym === "€" ? "EUR" : sym === "CHF" ? "CHF" : sym === "$" ? "EUR" : "EUR";
      setCurrency(code);
    } catch {
      // ignore
    }
  }, []);

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    try {
      const json = exportAppData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `BatiQuant_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(t("settings.export_error", { defaultValue: "Erreur lors de l’export. Réessayez." }));
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(t("settings.file_too_big", { defaultValue: "Fichier trop volumineux (max 5 Mo)." }));
      resetFileInput();
      return;
    }

    const ok = confirm(
      t("settings.import_confirm", {
        defaultValue: "Attention : L'importation remplacera vos données actuelles. Voulez-vous continuer ?",
      })
    );
    if (!ok) {
      resetFileInput();
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsImporting(false);
      resetFileInput();
      alert(t("settings.file_read_error", { defaultValue: "Erreur de lecture du fichier." }));
    };

    reader.onload = (evt) => {
      try {
        const content = evt.target?.result;
        if (!content || typeof content !== "string") {
          alert(t("settings.invalid_backup", { defaultValue: "Erreur: Fichier de sauvegarde invalide." }));
          return;
        }

        const success = importAppData(content, "replace");
        if (success) {
          alert(t("settings.restore_ok", { defaultValue: "Données restaurées avec succès !" }));
          window.location.reload();
        } else {
          alert(t("settings.invalid_backup", { defaultValue: "Erreur: Fichier de sauvegarde invalide." }));
        }
      } catch (err) {
        console.error(err);
        alert(t("settings.invalid_backup", { defaultValue: "Erreur: Fichier de sauvegarde invalide." }));
      } finally {
        setIsImporting(false);
        resetFileInput();
      }
    };

    reader.readAsText(file);
  };

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      try {
        localStorage.setItem("i18nextLng", lng);
      } catch {
        // ignore
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onCurrencyChange = (c: Currency) => {
    setCurrency(c);
    try {
      const current = getSettings();
      saveSettings({ ...current, currency: currencyToSymbol(c) });
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 px-2">
        {t("settings.title", { defaultValue: "Réglages" })}
      </h1>

      <div className="flex space-x-2 mb-6 px-2">
        <button
          type="button"
          onClick={() => setActiveTab("app")}
          className={`flex-1 py-2 text-sm font-extrabold rounded-lg ${
            activeTab === "app" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          {t("settings.tabs.app", { defaultValue: "Application" })}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`flex-1 py-2 text-sm font-extrabold rounded-lg ${
            activeTab === "company" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          {t("settings.tabs.company", { defaultValue: "Entreprise & Facturation" })}
        </button>
      </div>

      {activeTab === "company" ? (
        <CompanyProfileForm />
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex items-center">
              <div className="bg-emerald-100 p-2 rounded-full mr-3 text-emerald-600">
                <User size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-800">{t("settings.pro.title", { defaultValue: "Version Pro" })}</h3>
                <p className="text-xs text-slate-500">{t("settings.pro.subtitle", { defaultValue: "Licence active • Mode Hors-ligne" })}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="px-4 pt-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
              <HardDrive size={12} className="mr-2" /> {t("settings.data.title", { defaultValue: "Données & Sauvegarde" })}
            </h3>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group"
              >
                <Download size={24} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-extrabold text-slate-700">{t("settings.data.backup", { defaultValue: "Sauvegarder" })}</span>
                <span className="text-[10px] text-slate-400">{t("settings.data.export_json", { defaultValue: "Exporter JSON" })}</span>
              </button>

              <label
                className={`flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl transition-colors cursor-pointer group ${
                  isImporting ? "opacity-60 pointer-events-none" : "hover:bg-emerald-50 hover:border-emerald-200"
                }`}
                title={isImporting ? t("settings.data.importing", { defaultValue: "Import en cours…" }) : t("settings.data.import_title", { defaultValue: "Importer une sauvegarde" })}
              >
                <Upload size={24} className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-extrabold text-slate-700">
                  {isImporting ? t("settings.data.importing_short", { defaultValue: "Import..." }) : t("settings.data.restore", { defaultValue: "Restaurer" })}
                </span>
                <span className="text-[10px] text-slate-400">{t("settings.data.import_json", { defaultValue: "Importer JSON" })}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/json,.json"
                  onChange={handleImport}
                />
              </label>
            </div>

            <div className="px-4 pb-4">
              <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg flex items-start">
                <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                <p>{t("settings.data.warning", { defaultValue: "Important : Vos données sont stockées dans le navigateur. Pensez à faire une sauvegarde régulière." })}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="px-4 pt-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              {t("settings.app.title", { defaultValue: "Application" })}
            </h3>

            <div className="divide-y divide-slate-50">
              <div className="p-4 flex justify-between items-center">
                <span className="text-sm font-medium">{t("settings.app.currency", { defaultValue: "Devise" })}</span>
                <select
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value as Currency)}
                  className="bg-slate-50 border-none rounded text-sm text-slate-600 p-1 focus:ring-0"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>

              <div className="p-4 flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Languages size={16} className="text-slate-400" />
                  {t("settings.app.language", { defaultValue: "Langue" })}
                </span>

                <select
                  value={(i18n.language || "fr").split("-")[0]}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-slate-50 border-none rounded text-sm text-slate-600 p-1 focus:ring-0"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
              <button type="button" className="w-full p-4 flex items-center text-left hover:bg-slate-50">
                <HelpCircle size={18} className="text-slate-400 mr-3" />
                <span className="text-sm font-medium text-slate-700">{t("settings.support.help", { defaultValue: "Aide & FAQ" })}</span>
              </button>
              <button type="button" className="w-full p-4 flex items-center text-left hover:bg-slate-50">
                <Shield size={18} className="text-slate-400 mr-3" />
                <span className="text-sm font-medium text-slate-700">{t("settings.support.privacy", { defaultValue: "Politique de confidentialité" })}</span>
              </button>
            </div>
          </section>

          <div className="text-center pt-8">
            <p className="text-xs text-slate-400">{versionLabel}</p>
            <p className="text-[10px] text-slate-300 mt-2">{t("settings.footer", { defaultValue: "Aucune donnée n'est collectée." })}</p>
          </div>
        </div>
      )}
    </div>
  );
};