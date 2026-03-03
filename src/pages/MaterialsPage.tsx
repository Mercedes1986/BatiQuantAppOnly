// MaterialsPage.tsx (updated: EN defaultValue to avoid FR fallback, keys unchanged)
import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getMaterialMetadata } from "../constants";
import {
  Search,
  RotateCcw,
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
import { useTranslation } from "react-i18next";

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

type TabKey = "system" | "custom" | "labor" | "data";

export const MaterialsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>("system");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [systemMaterials, setSystemMaterials] = useState<any[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mostUsed, setMostUsed] = useState<string[]>([]);
  const [tax, setTax] = useState<TaxSettings>({ mode: "HT", vatRate: 20 });
  const [labor, setLabor] = useState<LaborSettings>({ enabled: false, globalHourlyRate: 45 });

  const [editingCustom, setEditingCustom] = useState<CustomMaterial | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [mappingTarget, setMappingTarget] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }),
    [i18n.language]
  );

  // categories based on loaded system list (updates when data/lang changes)
  const categories = useMemo(() => {
    const list = systemMaterials || [];
    const cats = Array.from(new Set(list.map((m: any) => String(m.category || "")).filter(Boolean)));
    cats.sort((a, b) => a.localeCompare(b, i18n.language || undefined));
    return cats;
  }, [systemMaterials, i18n.language]);

  const loadAll = useCallback(() => {
    setSystemMaterials(getSystemMaterialsList());
    setCustomMaterials(getCustomMaterials());
    setFavorites(getFavorites());
    setMostUsed(getMostUsedMaterials());
    setTax(getTaxSettings());
    setLabor(getLaborSettings());
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Recompute system labels/categories when language changes.
  // (System list is built from getMaterialMetadata() which uses i18next at call time.)
  useEffect(() => {
    loadAll();
  }, [i18n.language, loadAll]);

  useEffect(() => {
    const rawTab = String(searchParams.get("tab") || "").toLowerCase().trim();
    const allowed: TabKey[] = ["system", "custom", "labor", "data"];
    const nextTab: TabKey = allowed.includes(rawTab as TabKey) ? (rawTab as TabKey) : "system";

    const rawCat = String(searchParams.get("cat") || "").trim();
    const nextCat = rawCat && categories.includes(rawCat) ? rawCat : "All";

    setActiveTab((prev) => (prev !== nextTab ? nextTab : prev));
    setCategoryFilter((prev) => (prev !== nextCat ? nextCat : prev));
  }, [searchParams, categories]);

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

  const setTab = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab !== "system") updateUrl({ tab, cat: null });
    else updateUrl({ tab, cat: categoryFilter });
  };

  const setCategory = (c: string) => {
    setCategoryFilter(c);
    setActiveTab("system");
    updateUrl({ tab: "system", cat: c });
  };

  const handlePriceChange = (key: string, val: string) => {
    const num = parseFloat(val);
    if (Number.isNaN(num)) return;

    let priceToSave = num;
    if (tax.mode === "TTC") priceToSave = num / (1 + tax.vatRate / 100);

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
    try {
      const json = exportAppData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const linkEl = document.createElement("a");
      linkEl.href = url;
      linkEl.download = `BatiQuant_Backup_${new Date().toISOString().split("T")[0]}.json`;
      linkEl.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      window.alert(t("materials.export_error", { defaultValue: "Export failed." }));
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result;
        if (!content || typeof content !== "string") throw new Error("invalid");

        const ok = importAppData(content, "replace");
        if (ok) {
          window.alert(t("materials.import_ok", { defaultValue: "Import successful!" }));
          loadAll();
        } else {
          window.alert(t("materials.import_invalid", { defaultValue: "Error: Invalid file." }));
        }
      } catch (err) {
        console.error(err);
        window.alert(t("materials.import_invalid", { defaultValue: "Error: Invalid file." }));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const filteredSystemList = systemMaterials.filter((m) => {
    const matchesSearch = String(m.label || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === "All" || m.category === categoryFilter;
    const matchesFav = showFavoritesOnly ? favorites.includes(m.key) : true;
    return matchesSearch && matchesCat && matchesFav;
  });

  const tabLabel = (tab: TabKey) =>
    tab === "system"
      ? t("materials.tabs.catalog", { defaultValue: "Catalog" })
      : tab === "custom"
      ? t("materials.tabs.custom", { defaultValue: "My materials" })
      : tab === "labor"
      ? t("materials.tabs.labor", { defaultValue: "Labor" })
      : t("materials.tabs.data", { defaultValue: "Data" });

  return (
    <div className="pb-20 min-h-screen bg-transparent">
      <div className="bg-white sticky top-0 z-20 border-b border-slate-200 shadow-sm">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-extrabold text-slate-800">
              {t("materials.title", { defaultValue: "Materials & Pricing" })}
            </h1>

            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleTaxChange({ mode: "HT" })}
                className={`text-xs font-extrabold px-3 py-1 rounded ${
                  tax.mode === "HT" ? "bg-white shadow text-blue-600" : "text-slate-500"
                }`}
                type="button"
              >
                {t("materials.tax.ht", { defaultValue: "HT" })}
              </button>
              <button
                onClick={() => handleTaxChange({ mode: "TTC" })}
                className={`text-xs font-extrabold px-3 py-1 rounded ${
                  tax.mode === "TTC" ? "bg-white shadow text-blue-600" : "text-slate-500"
                }`}
                type="button"
              >
                {t("materials.tax.ttc", { defaultValue: "TTC" })}
              </button>
            </div>
          </div>

          <div className="mx-auto w-fit max-w-full">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl bg-slate-300/70 p-1.5 shadow-sm border border-slate-200">
              {(["system", "custom", "labor", "data"] as const).map((tb) => (
                <button
                  key={tb}
                  onClick={() => setTab(tb)}
                  className={[
                    "px-4 py-2 text-sm font-extrabold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === tb ? "bg-white text-slate-900 shadow" : "text-slate-800 hover:bg-white/60",
                  ].join(" ")}
                  type="button"
                >
                  {tabLabel(tb)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeTab === "system" && (
        <div className="p-4 space-y-4 animate-in fade-in">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t("materials.search", { defaultValue: "Search..." })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-2.5 rounded-lg border ${
                showFavoritesOnly
                  ? "bg-amber-100 border-amber-300 text-amber-600"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
              title={t("materials.favorites", { defaultValue: "Favorites" })}
              type="button"
            >
              <Star size={20} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="rounded-xl bg-slate-300/60 p-2 shadow-sm border border-slate-200">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategory("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-colors ${
                  categoryFilter === "All"
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/40 text-slate-800 border-slate-200 hover:bg-white/70"
                }`}
                type="button"
              >
                {t("materials.all", { defaultValue: "All" })}
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
                  type="button"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-w-5xl mx-auto">
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
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleFavorite(item.key)}
                      className="mt-0.5"
                      title={t("materials.favorite", { defaultValue: "Favorite" })}
                      type="button"
                    >
                      <Star
                        size={16}
                        className={
                          favorites.includes(item.key)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-400"
                        }
                      />
                    </button>

                    {/* Product thumbnail (one dedicated image per system key) */}
                    <div className="w-12 h-12 rounded-lg bg-white/45 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      <img
                        src={`/images/materials/${item.key}.png`}
                        alt={item.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                        onError={(e) => {
                          // If the user hasn't created the image yet, hide the img.
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>

                    <div>
                      <span className="font-extrabold text-slate-900 block text-sm truncate">
                        {item.label}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] uppercase font-extrabold text-slate-800 bg-white/45 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.category}
                        </span>

                        {item.isMapped && (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center">
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
                        title={t("materials.reset", { defaultValue: "Reset" })}
                        type="button"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setMappingTarget(item.key)}
                      className={`p-1.5 rounded border border-slate-200 ${
                        item.isMapped ? "text-emerald-800 bg-emerald-100/70" : "text-slate-700 bg-white/45"
                      }`}
                      title={t("materials.map", { defaultValue: "Map a material" })}
                      type="button"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="relative w-44 sm:w-56">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number(item.displayPrice || 0).toFixed(2)}
                      onChange={(e) => handlePriceChange(item.key, e.target.value)}
                      disabled={item.isMapped}
                      className={`w-full p-2 pl-8 border rounded-lg font-mono font-extrabold text-sm ${
                        item.isMapped
                          ? "bg-slate-200/70 text-slate-700 cursor-not-allowed border-slate-200"
                          : item.isModified
                          ? "text-blue-800 bg-white border-blue-200"
                          : "text-slate-900 bg-white border-slate-200"
                      }`}
                    />
                    <span className="absolute left-3 top-2 text-slate-500 text-xs mt-0.5">€</span>
                  </div>

                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    {String(item.unit || "").replace("€/", "/ ")}
                  </span>
                </div>
              </div>
            ))}

            {filteredSystemList.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                {t("materials.none_found", { defaultValue: "No materials found." })}
              </div>
            )}
          </div>
        </div>
      )}

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
              className="w-full py-3 mb-4 bg-blue-600 text-white rounded-xl font-extrabold flex justify-center items-center shadow-md text-sm"
              type="button"
            >
              <Plus size={18} className="mr-2" />{" "}
              {t("materials.create_custom", { defaultValue: "Create a material" })}
            </button>
          )}

          <div className="space-y-3">
            {customMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-slate-300/55 hover:bg-slate-300/70 transition-colors p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block text-sm">{mat.label}</span>
                  <div className="text-xs text-slate-700 mt-0.5 flex items-center space-x-2">
                    <span className="bg-white/45 px-1.5 rounded uppercase border border-slate-200">
                      {mat.category}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-blue-800 font-extrabold">
                      {euro.format(tax.mode === "TTC" ? mat.price * (1 + tax.vatRate / 100) : mat.price)}{" "}
                      {tax.mode} / {mat.unit}
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
                    title={t("common.edit", { defaultValue: "Edit" })}
                    type="button"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => {
                      const ok = window.confirm(
                        t("materials.confirm_delete_custom", { defaultValue: "Delete?" })
                      );
                      if (ok) {
                        deleteCustomMaterial(mat.id);
                        loadAll();
                      }
                    }}
                    className="p-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
                    title={t("common.delete", { defaultValue: "Delete" })}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {customMaterials.length === 0 && !showCustomForm && (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {t("materials.none_custom", { defaultValue: "No custom materials." })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "labor" && (
        <div className="p-4 animate-in fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Users size={20} className="text-blue-600 mr-2" />
                <span className="font-extrabold text-slate-800">
                  {t("materials.labor.title", { defaultValue: "Labor settings" })}
                </span>
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

            <div
              className={`space-y-4 transition-opacity ${
                labor.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
              }`}
            >
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1">
                  {t("materials.labor.rate", { defaultValue: "Average hourly rate (€/h)" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={labor.globalHourlyRate}
                    onChange={(e) =>
                      handleLaborChange({ globalHourlyRate: parseFloat(e.target.value) })
                    }
                    className="w-full p-2 pl-8 border rounded-lg bg-slate-50 text-slate-900 font-extrabold"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
                <Info size={14} className="inline mr-1 -mt-0.5" />
                {t("materials.labor.info", {
                  defaultValue:
                    "This rate will be used to estimate labor cost in calculators when Pro mode is enabled.",
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "data" && (
        <div className="p-4 space-y-4 animate-in fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center">
              <Settings size={18} className="mr-2" />{" "}
              {t("materials.tax_config", { defaultValue: "Tax configuration" })}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1">
                  {t("materials.vat_rate", { defaultValue: "VAT rate (%)" })}
                </label>
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
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center">
              <Download size={18} className="mr-2 text-blue-600" />{" "}
              {t("materials.backup_restore", { defaultValue: "Backup & restore" })}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                type="button"
              >
                <Download size={24} className="text-blue-600 mb-2" />
                <span className="text-sm font-extrabold text-slate-700">
                  {t("materials.export_json", { defaultValue: "Export JSON" })}
                </span>
              </button>

              <label className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <Upload size={24} className="text-emerald-600 mb-2" />
                <span className="text-sm font-extrabold text-slate-700">
                  {t("materials.import_json", { defaultValue: "Import JSON" })}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,application/json"
                  onChange={handleImport}
                />
              </label>
            </div>

            <p className="text-xs text-slate-400 mt-3 text-center">
              {t("materials.backup_hint", { defaultValue: "Export your data to transfer to another device." })}
            </p>
          </div>
        </div>
      )}

      {mappingTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b">
              <h3 className="font-extrabold text-lg">
                {t("materials.map_title", { defaultValue: "Map a material" })}
              </h3>
              <p className="text-xs text-slate-500">
                {t("materials.map_replace", { defaultValue: "Replaces" })}{" "}
                {getMaterialMetadata(mappingTarget).label || mappingTarget}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={() => handleMapping(mappingTarget, null)}
                className="w-full text-left p-3 rounded hover:bg-slate-50 text-sm text-red-600 font-extrabold border-b border-slate-100"
                type="button"
              >
                {t("materials.map_none", { defaultValue: "No mapping (default)" })}
              </button>

              {customMaterials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMapping(mappingTarget, m.id)}
                  className="w-full text-left p-3 rounded hover:bg-blue-50 text-sm flex justify-between items-center"
                  type="button"
                >
                  <span className="font-medium text-slate-700">{m.label}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{euro.format(m.price)}</span>
                </button>
              ))}

              {customMaterials.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">
                  {t("materials.map_need_custom", { defaultValue: "Create custom materials first." })}
                </div>
              )}
            </div>

            <div className="p-3 border-t">
              <button
                onClick={() => setMappingTarget(null)}
                className="w-full py-2 bg-slate-100 rounded-lg text-slate-600 font-extrabold text-sm"
                type="button"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomMaterialForm: React.FC<{
  initial: CustomMaterial | null;
  onSave: (m: CustomMaterial) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    onSave({
      id: initial?.id || generateId(),
      label: (formData.get("label") as string) || "",
      category: (formData.get("category") as string) || t("materials.misc", { defaultValue: "Misc" }),
      unit: (formData.get("unit") as string) as any,
      price: parseFloat(formData.get("price") as string),
      createdAt: initial?.createdAt || Date.now(),
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-lg mb-4 animate-in zoom-in-95">
      <h3 className="font-extrabold text-lg mb-4 text-slate-800">
        {initial ? t("common.edit", { defaultValue: "Edit" }) : t("materials.new", { defaultValue: "New" })}{" "}
        {t("materials.material", { defaultValue: "Material" })}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-1">
            {t("materials.name", { defaultValue: "Name" })}
          </label>
          <input
            name="label"
            defaultValue={initial?.label}
            required
            className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
            placeholder={t("materials.name_placeholder", { defaultValue: "e.g. Premium paint" })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("materials.category", { defaultValue: "Category" })}
            </label>
            <input
              name="category"
              defaultValue={initial?.category}
              className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
              placeholder={t("materials.category_placeholder", { defaultValue: "e.g. Paint" })}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1">
              {t("materials.unit", { defaultValue: "Unit" })}
            </label>
            <select
              name="unit"
              defaultValue={initial?.unit || Unit.PIECE}
              className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
            >
              {Object.values(Unit).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-1">
            {t("materials.unit_price_ht", { defaultValue: "Unit price (excl. VAT) (€)" })}
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            defaultValue={initial?.price}
            required
            className="w-full p-2 border rounded bg-white text-slate-900 text-sm font-extrabold"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 text-slate-500 text-sm font-extrabold"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-extrabold text-sm shadow-sm"
          >
            {t("common.save", { defaultValue: "Save" })}
          </button>
        </div>
      </form>
    </div>
  );
};