import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Edit2,
  Package,
  Star,
  Upload,
  Download,
  Settings,
  Link as LinkIcon,
  Users,
  Info,
} from "lucide-react";
import {
  getSystemMaterialsList,
  getCustomMaterials,
  saveCustomMaterial,
  deleteCustomMaterial,
  saveCustomPrice,
  resetCustomPrice,
  toggleFavorite,
  getFavorites,
  getMostUsedMaterials,
  getTaxSettings,
  setTaxSettings,
  getLaborSettings,
  setLaborSettings,
  exportAppData,
  importAppData,
  setMapping,
} from "../services/materialsService";
import { CustomMaterial, Unit, TaxSettings, LaborSettings } from "../types";
import { generateId } from "../services/storage";
import { MATERIAL_METADATA } from "../constants";

type TabKey = "system" | "custom" | "labor" | "data";

export const MaterialsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>("system");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Data
  const [systemMaterials, setSystemMaterials] = useState<any[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mostUsed, setMostUsed] = useState<string[]>([]);
  const [tax, setTax] = useState<TaxSettings>({ mode: "HT", vatRate: 20 });
  const [labor, setLabor] = useState<LaborSettings>({ enabled: false, globalHourlyRate: 45 });

  // Modals / Forms
  const [editingCustom, setEditingCustom] = useState<CustomMaterial | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [mappingTarget, setMappingTarget] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(Object.values(MATERIAL_METADATA).map((m: any) => m.category))).sort(),
    []
  );

  // Load all data
  const loadAll = useCallback(() => {
    setSystemMaterials(getSystemMaterialsList());
    setCustomMaterials(getCustomMaterials());
    setFavorites(getFavorites());
    setMostUsed(getMostUsedMaterials());
    setTax(getTaxSettings());
    setLabor(getLaborSettings());
  }, []);

  // initial load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ✅ Read URL (tab + cat) when URL changes, but DO NOT write URL here (prevents loops)
  useEffect(() => {
    const t = String(searchParams.get("tab") || "").toLowerCase().trim();
    const allowed: TabKey[] = ["system", "custom", "labor", "data"];
    const nextTab: TabKey = allowed.includes(t as TabKey) ? (t as TabKey) : "system";

    const rawCat = String(searchParams.get("cat") || "").trim();
    const nextCat = rawCat && categories.includes(rawCat) ? rawCat : "All";

    // Update states only if different (avoid useless re-render)
    setActiveTab((prev) => (prev !== nextTab ? nextTab : prev));
    setCategoryFilter((prev) => (prev !== nextCat ? nextCat : prev));
  }, [searchParams, categories]);

  // ✅ Write URL only from user actions (no loop)
  const updateUrl = useCallback(
    (patch: { tab?: TabKey; cat?: string | null }, replace = true) => {
      const next = new URLSearchParams(searchParams);

      if (patch.tab) next.set("tab", patch.tab);

      if (patch.cat === null) {
        next.delete("cat");
      } else if (typeof patch.cat === "string") {
        if (patch.cat === "All" || patch.cat.trim() === "") next.delete("cat");
        else next.set("cat", patch.cat);
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  const setTab = (t: TabKey) => {
    setActiveTab(t);

    // si on sort de system, on retire cat
    if (t !== "system") {
      updateUrl({ tab: t, cat: null });
    } else {
      // system: garder la cat actuelle (si All -> pas de cat)
      updateUrl({ tab: t, cat: categoryFilter });
    }
  };

  const setCategory = (c: string) => {
    setCategoryFilter(c);

    // la catégorie n’a de sens que sur system
    setActiveTab("system");
    updateUrl({ tab: "system", cat: c });
  };

  // --- Handlers ---
  const handlePriceChange = (key: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;

    let priceToSave = num;
    if (tax.mode === "TTC") {
      priceToSave = num / (1 + tax.vatRate / 100);
    }

    saveCustomPrice(key, priceToSave);
    loadAll();
  };

  const handleReset = (key: string) => {
    resetCustomPrice(key);
    loadAll();
  };

  const handleFavorite = (key: string) => {
    toggleFavorite(key);
    setFavorites(getFavorites());
  };

  const handleTaxChange = (newTax: Partial<TaxSettings>) => {
    const s = { ...tax, ...newTax };
    setTaxSettings(s);
    setTax(s);
    loadAll();
  };

  const handleLaborChange = (newLabor: Partial<LaborSettings>) => {
    const s = { ...labor, ...newLabor };
    setLaborSettings(s);
    setLabor(s);
  };

  const handleMapping = (systemKey: string, customId: string | null) => {
    setMapping(systemKey, customId);
    setMappingTarget(null);
    loadAll();
  };

  const handleExport = () => {
    const json = exportAppData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const linkEl = document.createElement("a");
    linkEl.href = url;
    linkEl.download = `BatiQuant_Backup_${new Date().toISOString().split("T")[0]}.json`;
    linkEl.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const success = importAppData(evt.target.result as string, "replace");
        if (success) {
          alert("Import réussi !");
          loadAll();
        } else {
          alert("Erreur: Fichier invalide.");
        }
      }
    };
    reader.readAsText(file);
  };

  // --- Filtering System List ---
  const filteredSystemList = systemMaterials.filter((m) => {
    const matchesSearch = String(m.label || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === "All" || m.category === categoryFilter;
    const matchesFav = showFavoritesOnly ? favorites.includes(m.key) : true;
    return matchesSearch && matchesCat && matchesFav;
  });

  const tabLabel = (t: TabKey) =>
    t === "system" ? "Catalogue" : t === "custom" ? "Mes Matériaux" : t === "labor" ? "Main d'œuvre" : "Données";

  return (
    <div className="pb-20 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 border-b border-slate-200 shadow-sm">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Matériaux & Prix</h1>

            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleTaxChange({ mode: "HT" })}
                className={`text-xs font-bold px-3 py-1 rounded ${
                  tax.mode === "HT" ? "bg-white shadow text-blue-600" : "text-slate-500"
                }`}
              >
                HT
              </button>
              <button
                onClick={() => handleTaxChange({ mode: "TTC" })}
                className={`text-xs font-bold px-3 py-1 rounded ${
                  tax.mode === "TTC" ? "bg-white shadow text-blue-600" : "text-slate-500"
                }`}
              >
                TTC
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-auto w-fit max-w-full">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl bg-slate-300/70 p-1.5 shadow-sm border border-slate-200">
              {(["system", "custom", "labor", "data"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === t ? "bg-white text-slate-900 shadow" : "text-slate-800 hover:bg-white/60",
                  ].join(" ")}
                >
                  {tabLabel(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- TAB: SYSTEM MATERIALS --- */}
      {activeTab === "system" && (
        <div className="p-4 space-y-4 animate-in fade-in">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-2.5 rounded-lg border ${
                showFavoritesOnly ? "bg-amber-100 border-amber-300 text-amber-600" : "bg-white border-slate-200 text-slate-400"
              }`}
              title="Favoris"
            >
              <Star size={20} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Category Filter */}
          <div className="rounded-xl bg-slate-300/60 p-2 shadow-sm border border-slate-200">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategory("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-colors ${
                  categoryFilter === "All"
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/40 text-slate-800 border-slate-200 hover:bg-white/70"
                }`}
              >
                Tout
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-colors ${
                    categoryFilter === c
                      ? "bg-white text-slate-900 border-white"
                      : "bg-white/25 text-slate-800 border-slate-200 hover:bg-white/60"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {filteredSystemList.map((item) => (
              <div
                key={item.key}
                className={[
                  "border rounded-xl p-3 shadow-sm",
                  "bg-slate-300/55 hover:bg-slate-300/70 transition-colors",
                  item.isModified ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-2">
                    <button onClick={() => handleFavorite(item.key)} className="mt-0.5" title="Favori">
                      <Star
                        size={16}
                        className={favorites.includes(item.key) ? "text-amber-400 fill-amber-400" : "text-slate-400"}
                      />
                    </button>

                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{item.label}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-800 bg-white/45 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.category}
                        </span>
                        {item.isMapped && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center">
                            <LinkIcon size={10} className="mr-1" /> {item.mappedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.isModified && (
                      <button
                        onClick={() => handleReset(item.key)}
                        className="text-slate-700 hover:text-red-600 p-1.5 bg-white/45 rounded border border-slate-200"
                        title="Réinitialiser"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setMappingTarget(item.key)}
                      className={`p-1.5 rounded border border-slate-200 ${
                        item.isMapped ? "text-emerald-800 bg-emerald-100/70" : "text-slate-700 bg-white/45"
                      }`}
                      title="Associer un matériau"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mt-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number(item.displayPrice || 0).toFixed(2)}
                      onChange={(e) => handlePriceChange(item.key, e.target.value)}
                      disabled={item.isMapped}
                      className={`w-full p-2 pl-8 border rounded-lg font-mono font-bold text-sm ${
                        item.isMapped
                          ? "bg-slate-200/70 text-slate-700 cursor-not-allowed border-slate-200"
                          : item.isModified
                          ? "text-blue-800 bg-white border-blue-200"
                          : "text-slate-900 bg-white border-slate-200"
                      }`}
                    />
                    <span className="absolute left-3 top-2 text-slate-500 text-xs mt-0.5">€</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 w-12 text-right">
                    {String(item.unit || "").replace("€/", "/ ")}
                  </span>
                </div>
              </div>
            ))}

            {filteredSystemList.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">Aucun matériau trouvé.</div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: CUSTOM MATERIALS --- */}
      {activeTab === "custom" && (
        <div className="p-4 animate-in fade-in">
          {showCustomForm ? (
            <CustomMaterialForm
              initial={editingCustom}
              onSave={(m) => {
                saveCustomMaterial(m);
                loadAll();
                setShowCustomForm(false);
              }}
              onCancel={() => {
                setShowCustomForm(false);
                setEditingCustom(null);
              }}
            />
          ) : (
            <button
              onClick={() => {
                setEditingCustom(null);
                setShowCustomForm(true);
              }}
              className="w-full py-3 mb-4 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center shadow-md text-sm"
            >
              <Plus size={18} className="mr-2" /> Créer un matériau
            </button>
          )}

          <div className="space-y-3">
            {customMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-slate-300/55 hover:bg-slate-300/70 transition-colors p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-900 block text-sm">{mat.label}</span>
                  <div className="text-xs text-slate-700 mt-0.5 flex items-center space-x-2">
                    <span className="bg-white/45 px-1.5 rounded uppercase border border-slate-200">{mat.category}</span>
                    <span>•</span>
                    <span className="font-mono text-blue-800 font-bold">
                      {(tax.mode === "TTC" ? mat.price * (1 + tax.vatRate / 100) : mat.price).toFixed(2)} € {tax.mode} /{" "}
                      {mat.unit}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingCustom(mat);
                      setShowCustomForm(true);
                    }}
                    className="p-2 text-slate-700 hover:bg-white/45 rounded border border-transparent hover:border-slate-200"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Supprimer ?")) {
                        deleteCustomMaterial(mat.id);
                        loadAll();
                      }
                    }}
                    className="p-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {customMaterials.length === 0 && !showCustomForm && (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun matériau personnalisé.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: LABOR --- */}
      {activeTab === "labor" && (
        <div className="p-4 animate-in fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Users size={20} className="text-blue-600 mr-2" />
                <span className="font-bold text-slate-800">Paramètres Main d'œuvre</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={labor.enabled}
                  onChange={(e) => handleLaborChange({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className={`space-y-4 transition-opacity ${labor.enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Taux Horaire Moyen (€/h)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={labor.globalHourlyRate}
                    onChange={(e) => handleLaborChange({ globalHourlyRate: parseFloat(e.target.value) })}
                    className="w-full p-2 pl-8 border rounded-lg bg-slate-50 text-slate-900 font-bold"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
                <Info size={14} className="inline mr-1 -mt-0.5" />
                Ce taux sera utilisé pour estimer le coût de la main d'œuvre dans les calculateurs si le mode "Pro" est activé.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: DATA --- */}
      {activeTab === "data" && (
        <div className="p-4 space-y-4 animate-in fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center">
              <Settings size={18} className="mr-2" /> Configuration Fiscale
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Taux TVA (%)</label>
                <select
                  value={tax.vatRate}
                  onChange={(e) => handleTaxChange({ vatRate: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded-lg bg-slate-50 text-sm"
                >
                  <option value={20}>20%</option>
                  <option value={10}>10%</option>
                  <option value={5.5}>5.5%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center">
              <Save size={18} className="mr-2" /> Sauvegarde & Restauration
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Download size={24} className="text-blue-600 mb-2" />
                <span className="text-sm font-bold text-slate-700">Exporter JSON</span>
              </button>
              <label className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <Upload size={24} className="text-emerald-600 mb-2" />
                <span className="text-sm font-bold text-slate-700">Importer JSON</span>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Exportez vos données pour les transférer sur un autre appareil.</p>
          </div>
        </div>
      )}

      {/* --- MODAL: MAPPING --- */}
      {mappingTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Associer un matériau</h3>
              <p className="text-xs text-slate-500">Remplace {MATERIAL_METADATA[mappingTarget]?.label}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={() => handleMapping(mappingTarget, null)}
                className="w-full text-left p-3 rounded hover:bg-slate-50 text-sm text-red-600 font-bold border-b border-slate-100"
              >
                Aucune association (Défaut)
              </button>
              {customMaterials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMapping(mappingTarget, m.id)}
                  className="w-full text-left p-3 rounded hover:bg-blue-50 text-sm flex justify-between items-center"
                >
                  <span className="font-medium text-slate-700">{m.label}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{m.price}€</span>
                </button>
              ))}
              {customMaterials.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">Créez d'abord des matériaux personnalisés.</div>
              )}
            </div>
            <div className="p-3 border-t">
              <button onClick={() => setMappingTarget(null)} className="w-full py-2 bg-slate-100 rounded-lg text-slate-600 font-bold text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: CUSTOM MATERIAL FORM ---
const CustomMaterialForm: React.FC<{
  initial: CustomMaterial | null;
  onSave: (m: CustomMaterial) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    onSave({
      id: initial?.id || generateId(),
      label: (formData.get("label") as string) || "",
      category: (formData.get("category") as string) || "Divers",
      unit: (formData.get("unit") as string) as any,
      price: parseFloat(formData.get("price") as string),
      createdAt: initial?.createdAt || Date.now(),
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-lg mb-4 animate-in zoom-in-95">
      <h3 className="font-bold text-lg mb-4 text-slate-800">{initial ? "Modifier" : "Nouveau"} Matériau</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Nom</label>
          <input
            name="label"
            defaultValue={initial?.label}
            required
            className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
            placeholder="Ex: Peinture Luxe"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Catégorie</label>
            <input
              name="category"
              defaultValue={initial?.category}
              className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
              placeholder="Ex: Peinture"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Unité</label>
            <select name="unit" defaultValue={initial?.unit || Unit.PIECE} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
              {Object.values(Unit).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Prix Unitaire HT (€)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            defaultValue={initial?.price}
            required
            className="w-full p-2 border rounded bg-white text-slate-900 text-sm font-bold"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-slate-500 text-sm font-bold">
            Annuler
          </button>
          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
};