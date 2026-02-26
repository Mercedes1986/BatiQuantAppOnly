import React, { useMemo, useRef, useState } from "react";
import {
  User,
  Shield,
  HelpCircle,
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { exportAppData, importAppData } from "../services/materialsService";

// ✅ Chemin correct depuis src/pages/SettingsPage.tsx
// ⚠️ Si ton fichier exporte en default, remplace par: import CompanyProfileForm from "../components/documents/CompanyProfileForm";
import { CompanyProfileForm } from "../components/documents/CompanyProfileForm";

type SettingsTab = "app" | "company";

export const SettingsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("app");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "CAD" | "CHF">("EUR");
  const [isImporting, setIsImporting] = useState(false);

  const versionLabel = useMemo(() => "BatiQuant v1.2.0", []);

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

      // ✅ libère l’URL blob
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l’export. Réessayez.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ petite sécurité: taille max (ex: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Fichier trop volumineux (max 5 Mo).");
      resetFileInput();
      return;
    }

    if (!confirm("Attention : L'importation remplacera vos données actuelles. Voulez-vous continuer ?")) {
      resetFileInput();
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsImporting(false);
      resetFileInput();
      alert("Erreur de lecture du fichier.");
    };

    reader.onload = (evt) => {
      try {
        const content = evt.target?.result;
        if (!content || typeof content !== "string") {
          alert("Erreur: Fichier de sauvegarde invalide.");
          return;
        }

        const success = importAppData(content, "replace");
        if (success) {
          alert("Données restaurées avec succès !");
          window.location.reload();
        } else {
          alert("Erreur: Fichier de sauvegarde invalide.");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur: Fichier de sauvegarde invalide.");
      } finally {
        setIsImporting(false);
        resetFileInput();
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-4 pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 px-2">Réglages</h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 px-2">
        <button
          type="button"
          onClick={() => setActiveTab("app")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg ${
            activeTab === "app"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Application
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg ${
            activeTab === "company"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Entreprise & Facturation
        </button>
      </div>

      {activeTab === "company" ? (
        <CompanyProfileForm />
      ) : (
        <div className="space-y-6">
          {/* Account Section */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex items-center">
              <div className="bg-emerald-100 p-2 rounded-full mr-3 text-emerald-600">
                <User size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">Version Pro</h3>
                <p className="text-xs text-slate-500">Licence active • Mode Hors-ligne</p>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="px-4 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <HardDrive size={12} className="mr-2" /> Données & Sauvegarde
            </h3>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group"
              >
                <Download size={24} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-700">Sauvegarder</span>
                <span className="text-[10px] text-slate-400">Exporter JSON</span>
              </button>

              <label
                className={`flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl transition-colors cursor-pointer group ${
                  isImporting ? "opacity-60 pointer-events-none" : "hover:bg-emerald-50 hover:border-emerald-200"
                }`}
                title={isImporting ? "Import en cours…" : "Importer une sauvegarde"}
              >
                <Upload size={24} className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-700">
                  {isImporting ? "Import..." : "Restaurer"}
                </span>
                <span className="text-[10px] text-slate-400">Importer JSON</span>
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
                <p>
                  Important : Vos données sont stockées dans le navigateur. Pensez à faire une sauvegarde régulière.
                </p>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="px-4 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Application</h3>
            <div className="divide-y divide-slate-50">
              <div className="p-4 flex justify-between items-center">
                <span className="text-sm font-medium">Devise</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-slate-50 border-none rounded text-sm text-slate-600 p-1 focus:ring-0"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
              <button type="button" className="w-full p-4 flex items-center text-left hover:bg-slate-50">
                <HelpCircle size={18} className="text-slate-400 mr-3" />
                <span className="text-sm font-medium text-slate-700">Aide & FAQ</span>
              </button>
              <button type="button" className="w-full p-4 flex items-center text-left hover:bg-slate-50">
                <Shield size={18} className="text-slate-400 mr-3" />
                <span className="text-sm font-medium text-slate-700">Politique de confidentialité</span>
              </button>
            </div>
          </section>

          <div className="text-center pt-8">
            <p className="text-xs text-slate-400">{versionLabel}</p>
            <p className="text-[10px] text-slate-300 mt-2">Aucune donnée n&apos;est collectée.</p>
          </div>
        </div>
      )}
    </div>
  );
};
