import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, Shield, HelpCircle, HardDrive, Download, Upload, AlertTriangle, Languages, Building2, ChevronRight, Globe, Coins } from "lucide-react";
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
      const sym = s.currency || "€";
      const code: Currency = sym === "€" ? "EUR" : sym === "CHF" ? "CHF" : sym === "$" ? "EUR" : "EUR";
      setCurrency(code);
    } catch {}
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
    const ok = confirm(t("settings.import_confirm", { defaultValue: "Attention : L'importation remplacera vos données actuelles. Voulez-vous continuer ?" }));
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
      localStorage.setItem("i18nextLng", lng);
    } catch (e) {
      console.error(e);
    }
  };

  const onCurrencyChange = (c: Currency) => {
    setCurrency(c);
    try {
      const current = getSettings();
      saveSettings({ ...current, currency: currencyToSymbol(c) });
    } catch {}
  };

  const tabButton = (tab: SettingsTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={[
        "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-extrabold transition-colors",
        activeTab === tab ? "bg-white text-slate-900 shadow" : "text-slate-700 hover:bg-white/70",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );

  const rowClass = "w-full px-4 py-4 flex flex-col gap-3 text-left transition-colors hover:bg-white/70 sm:flex-row sm:items-center sm:justify-between";

  return (
    <div className="app-shell app-shell--settings min-h-screen bg-transparent">
      <div className="page-frame space-y-4">
        <section className="glass-panel rounded-[28px] p-4 sm:rounded-[32px] sm:p-5 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-[26px] font-extrabold leading-tight text-slate-800 sm:text-2xl">{t("settings.title", { defaultValue: "Settings" })}</h1>
            </div>
            <div className="max-w-full overflow-x-auto no-scrollbar">
              <div className="mx-auto flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-200/80 p-1.5 shadow-sm">
                {tabButton("app", t("settings.tabs.app", { defaultValue: "Application" }), <Globe size={16} />)}
                {tabButton("company", t("settings.tabs.company", { defaultValue: "Entreprise & Facturation" }), <Building2 size={16} />)}
              </div>
            </div>
          </div>
        </section>

        {activeTab === "company" ? (
          <div className="glass-panel rounded-[28px] p-1 sm:p-2">
            <CompanyProfileForm />
          </div>
        ) : (
          <div className="space-y-4">
            <section className="glass-panel overflow-hidden rounded-[28px]">
              <div className="flex items-center p-4 sm:p-5">
                <div className="mr-3 rounded-2xl bg-emerald-100 p-3 text-emerald-600"><User size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-800">{t("settings.pro.title", { defaultValue: "Version Pro" })}</h3>
                  <p className="text-xs text-slate-500">{t("settings.pro.subtitle", { defaultValue: "Licence active • Mode Hors-ligne" })}</p>
                </div>
              </div>
            </section>

            <section className="glass-panel overflow-hidden rounded-[28px]">
              <h3 className="flex items-center px-4 pt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400 sm:px-5 sm:pt-5"><HardDrive size={12} className="mr-2" />{t("settings.data.title", { defaultValue: "Données & Sauvegarde" })}</h3>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
                <button type="button" onClick={handleExport} className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/70 p-5 transition-colors hover:border-blue-200 hover:bg-blue-50/70">
                  <Download size={24} className="mb-2 text-blue-600 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-extrabold text-slate-700">{t("settings.data.backup", { defaultValue: "Sauvegarder" })}</span>
                  <span className="text-[10px] text-slate-400">{t("settings.data.export_json", { defaultValue: "Exporter JSON" })}</span>
                </button>
                <label className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/70 p-5 transition-colors ${isImporting ? "pointer-events-none opacity-60" : "hover:border-emerald-200 hover:bg-emerald-50/70"}`}>
                  <Upload size={24} className="mb-2 text-emerald-600 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-extrabold text-slate-700">{isImporting ? t("settings.data.importing_short", { defaultValue: "Import..." }) : t("settings.data.restore", { defaultValue: "Restaurer" })}</span>
                  <span className="text-[10px] text-slate-400">{t("settings.data.import_json", { defaultValue: "Importer JSON" })}</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept="application/json,.json" onChange={handleImport} />
                </label>
              </div>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="flex items-start rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                  <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                  <p>{t("settings.data.warning", { defaultValue: "Important : Vos données sont stockées dans le navigateur. Pensez à faire une sauvegarde régulière." })}</p>
                </div>
              </div>
            </section>

            <section className="glass-panel overflow-hidden rounded-[28px]">
              <h3 className="px-4 pt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400 sm:px-5 sm:pt-5">{t("settings.app.title", { defaultValue: "Application" })}</h3>
              <div className="divide-y divide-slate-100">
                <div className={rowClass}>
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Coins size={16} className="text-slate-400" />{t("settings.app.currency", { defaultValue: "Currency" })}</span>
                  <select value={currency} onChange={(e) => onCurrencyChange(e.target.value as Currency)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:ring-0 sm:w-auto">
                    <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="CAD">CAD ($)</option><option value="CHF">CHF</option>
                  </select>
                </div>
                <div className={rowClass}>
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Languages size={16} className="text-slate-400" />{t("settings.app.language", { defaultValue: "Language" })}</span>
                  <select value={(i18n.language || "fr").split("-")[0]} onChange={(e) => changeLanguage(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:ring-0 sm:w-auto">
                    <option value="fr">Français</option><option value="en">English</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="glass-panel overflow-hidden rounded-[28px]">
              <div className="divide-y divide-slate-100">
                <button type="button" className="w-full px-4 py-4 text-left transition-colors hover:bg-white/70 sm:px-5">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><HelpCircle size={18} className="text-slate-400" /><span className="text-sm font-medium text-slate-700">{t("settings.support.help", { defaultValue: "Aide & FAQ" })}</span></div><ChevronRight size={18} className="text-slate-300" /></div>
                </button>
                <button type="button" className="w-full px-4 py-4 text-left transition-colors hover:bg-white/70 sm:px-5">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Shield size={18} className="text-slate-400" /><span className="text-sm font-medium text-slate-700">{t("settings.support.privacy", { defaultValue: "Politique de confidentialité" })}</span></div><ChevronRight size={18} className="text-slate-300" /></div>
                </button>
              </div>
            </section>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-400">{versionLabel}</p>
              <p className="mt-2 text-[10px] text-slate-300">{t("settings.footer", { defaultValue: "Aucune donnée n'est collectée." })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
