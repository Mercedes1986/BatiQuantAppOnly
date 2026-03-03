import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSystemMaterialsList } from "../../services/materialsService";
import {
  Settings,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Euro,
  Percent,
  FileText,
} from "lucide-react";

import { HouseProject, QuoteManualLine, Unit } from "../../types";
import { calculateQuote, generateQuoteCSV, ComputedQuote } from "../../services/quote";
import { saveHouseProject, generateId } from "../../services/storage";

interface Props {
  project: HouseProject;
  onUpdate: () => void;
}

type QuoteSettings = {
  taxRate: number;
  marginPercent: number;
  discountAmount: number;
  showLabor: boolean;
};

const DEFAULT_SETTINGS: QuoteSettings = {
  taxRate: 20,
  marginPercent: 0,
  discountAmount: 0,
  showLabor: true,
};

export const QuotePanel: React.FC<Props> = ({ project, onUpdate }) => {
  const { t, i18n } = useTranslation();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLine, setShowAddLine] = useState<string | null>(null);

  const settings: QuoteSettings = useMemo(() => {
    return {
      ...DEFAULT_SETTINGS,
      ...(project.quote?.settings || {}),
    };
  }, [project.quote?.settings]);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }),
    [i18n.language]
  );

  // Label->image index for lines coming from calculators
  const systemImageByLabel = useMemo(() => {
    const map = new Map<string, string>();
    try {
      const list = getSystemMaterialsList();
      list.forEach((m: any) => {
        const k = String(m.label || "").toLowerCase().trim();
        if (k) map.set(k, m.imageUrl || "");
      });
    } catch {
      // ignore
    }
    return map;
  }, [i18n.language]);

  const computed: ComputedQuote = useMemo(() => calculateQuote(project), [project]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const patchProjectQuote = (patch: Partial<HouseProject["quote"]>) => {
    const updated: HouseProject = {
      ...project,
      quote: {
        settings: settings,
        manualLines: project.quote?.manualLines || [],
        updatedAt: new Date().toISOString(),
        ...(project.quote || {}),
        ...patch,
      } as any,
    };
    saveHouseProject(updated);
    onUpdate();
  };

  const handleUpdateSettings = (newSettings: Partial<QuoteSettings>) => {
    patchProjectQuote({
      settings: { ...settings, ...newSettings },
      manualLines: project.quote?.manualLines || [],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddLine = (stepId: string, line: Partial<QuoteManualLine>) => {
    const newLine: QuoteManualLine = {
      id: generateId(),
      stepId,
      label: line.label || t("quote.addline.default_label", { defaultValue: "Nouvelle ligne" }),
      quantity: typeof line.quantity === "number" ? line.quantity : 1,
      unit: (line.unit as Unit) || Unit.PIECE,
      unitPrice: typeof line.unitPrice === "number" ? line.unitPrice : 0,
      category: (line.category as any) || "labor",
    };

    const nextManualLines = [...(project.quote?.manualLines || []), newLine];

    patchProjectQuote({
      settings,
      manualLines: nextManualLines,
      updatedAt: new Date().toISOString(),
    });

    setShowAddLine(null);
  };

  const handleDeleteLine = (lineId: string) => {
    const current = project.quote?.manualLines || [];
    const next = current.filter((l) => l.id !== lineId);

    patchProjectQuote({
      settings,
      manualLines: next,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExport = () => {
    const csv = generateQuoteCSV(computed, project.name, t);
    // ✅ BOM UTF-8 pour Excel
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Quote_${project.name.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            {t("quote.title", { defaultValue: "Devis estimatif" })}
          </h2>
          <p className="text-xs text-slate-500">
            {t("quote.subtitle", { defaultValue: "Mis à jour instantanément" })}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            type="button"
            className={`p-2 rounded-lg border transition-colors ${
              showSettings
                ? "bg-blue-50 border-blue-300 text-blue-600"
                : "bg-white border-slate-200 text-slate-600"
            }`}
            aria-label={t("quote.settings", { defaultValue: "Paramètres" })}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={handleExport}
            type="button"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={t("quote.export_csv", { defaultValue: "Exporter CSV" })}
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-blue-100 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-700 uppercase">
            {t("quote.settings_title", { defaultValue: "Paramètres du devis" })}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1">
                {t("quote.tax", { defaultValue: "TVA (%)" })}
              </label>
              <select
                value={settings.taxRate}
                onChange={(e) => handleUpdateSettings({ taxRate: Number(e.target.value) })}
                className="w-full p-2 border rounded bg-white text-slate-900"
              >
                <option value={20}>{t("quote.tax_20", { defaultValue: "20% (Standard)" })}</option>
                <option value={10}>{t("quote.tax_10", { defaultValue: "10% (Rénovation)" })}</option>
                <option value={5.5}>{t("quote.tax_55", { defaultValue: "5.5% (Énergétique)" })}</option>
                <option value={0}>{t("quote.tax_0", { defaultValue: "0% (Auto-entrepreneur)" })}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1">
                {t("quote.margin", { defaultValue: "Marge (%)" })}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.marginPercent}
                  onChange={(e) => handleUpdateSettings({ marginPercent: Number(e.target.value) })}
                  className="w-full p-2 pl-8 border rounded bg-white text-slate-900"
                />
                <Percent size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1">
                {t("quote.discount", { defaultValue: "Remise (€)" })}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.discountAmount}
                  onChange={(e) => handleUpdateSettings({ discountAmount: Number(e.target.value) })}
                  className="w-full p-2 pl-8 border rounded bg-white text-slate-900"
                />
                <Euro size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-blue-600 text-slate-900 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="grid grid-cols-2 gap-y-2 text-sm relative z-10">
          <span className="text-slate-500">{t("quote.total_materials_ht", { defaultValue: "Total Matériaux HT" })}</span>
          <span className="text-right font-medium">{euro.format(computed.totalMaterialsHT)}</span>

          <span className="text-slate-500">{t("quote.total_labor_ht", { defaultValue: "Total Main d'œuvre HT" })}</span>
          <span className="text-right font-medium">{euro.format(computed.totalLaborHT)}</span>

          {computed.marginAmount > 0 && (
            <>
              <span className="text-emerald-600">
                {t("quote.margin_label", { defaultValue: "Marge" })} ({settings.marginPercent}%)
              </span>
              <span className="text-right font-medium text-emerald-600">
                +{euro.format(computed.marginAmount)}
              </span>
            </>
          )}

          <div className="col-span-2 h-px bg-slate-100 my-2"></div>

          <span className="text-slate-700 font-extrabold">{t("quote.total_ht", { defaultValue: "TOTAL HT" })}</span>
          <span className="text-right font-extrabold text-lg">{euro.format(computed.finalHT)}</span>

          <span className="text-slate-500">
            {t("quote.vat", { defaultValue: "TVA" })} ({settings.taxRate}%)
          </span>
          <span className="text-right">{euro.format(computed.taxAmount)}</span>

          <div className="col-span-2 pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-lg font-extrabold">{t("quote.net_to_pay", { defaultValue: "NET À PAYER" })}</span>
            <span className="text-3xl font-extrabold text-blue-600">{euro.format(computed.totalTTC)}</span>
          </div>
        </div>

        <FileText className="absolute -bottom-4 -right-4 text-slate-100" size={120} />
      </div>

      <div className="space-y-4">
        {computed.sections.map((section) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection(section.id)}
              type="button"
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {expandedSections[section.id] ? (
                  <ChevronDown size={20} className="text-slate-400" />
                ) : (
                  <ChevronRight size={20} className="text-slate-400" />
                )}
                <span className="font-extrabold text-slate-800">{section.label}</span>
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                  {section.items.length}
                </span>
              </div>
              <span className="font-extrabold text-slate-700">{euro.format(section.totalHT)}</span>
            </button>

            {expandedSections[section.id] && (
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                    <tr>
                      <th className="p-3 pl-4">{t("quote.table.designation", { defaultValue: "Désignation" })}</th>
                      <th className="p-3 text-center">{t("quote.table.qty", { defaultValue: "Qté" })}</th>
                      <th className="p-3 text-right">{t("quote.table.unit_price", { defaultValue: "P.U." })}</th>
                      <th className="p-3 text-right pr-4">{t("quote.table.total", { defaultValue: "Total" })}</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {section.items.map((item, idx) => (
                      <tr key={`${section.id}-${idx}`} className={item.isManual ? "bg-amber-50/30" : ""}>
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                              <img
                                src={
                                  systemImageByLabel.get(String(item.label || "").toLowerCase().trim()) ||
                                  "/images/calculators/menuiseries.png"
                                }
                                alt=""
                                className="w-full h-full object-cover"
                                draggable={false}
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = "/images/calculators/menuiseries.png";
                                }}
                              />
                            </div>

                            <div>
                              <div className="font-medium text-slate-800">{item.label}</div>
                          {item.type === "labor" && (
                            <span className="text-[10px] text-amber-600 bg-amber-100 px-1 rounded">
                              {t("quote.labor_tag", { defaultValue: "Main d'œuvre" })}
                            </span>
                          )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-center text-slate-600">
                          {item.quantity}{" "}
                          <span className="text-[10px] text-slate-400">{item.unit}</span>
                        </td>

                        <td className="p-3 text-right text-slate-600">{item.unitPrice.toFixed(2)}</td>

                        <td className="p-3 text-right font-medium text-slate-800 pr-4">
                          {item.totalPrice.toFixed(2)}
                        </td>

                        <td className="p-3 text-center">
                          {item.isManual && (
                            <button
                              onClick={() => handleDeleteLine(item.id)}
                              type="button"
                              className="text-slate-300 hover:text-red-500 transition-colors"
                              aria-label={t("common.delete", { defaultValue: "Supprimer" })}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  {showAddLine === section.id ? (
                    <AddLineForm
                      onCancel={() => setShowAddLine(null)}
                      onAdd={(line) => handleAddLine(section.id, line)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddLine(section.id)}
                      type="button"
                      className="flex items-center text-xs font-extrabold text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={16} className="mr-1" />{" "}
                      {t("quote.addline.open", { defaultValue: "Ajouter une ligne (MO, Location…)" })}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {computed.sections.length === 0 && (
          <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            <p>{t("quote.empty.title", { defaultValue: "Aucune donnée." })}</p>
            <p className="text-sm">
              {t("quote.empty.subtitle", { defaultValue: "Sauvegardez des calculs pour générer le devis." })}
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => setShowAddLine("global")}
            type="button"
            className="flex items-center px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-full text-sm font-extrabold text-slate-600 hover:bg-slate-50"
          >
            <Plus size={16} className="mr-2" /> {t("quote.addline.global_btn", { defaultValue: "Ajouter frais généraux" })}
          </button>
        </div>

        {showAddLine === "global" && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
            <h4 className="font-extrabold text-sm mb-3">
              {t("quote.addline.global_title", { defaultValue: "Ajouter une ligne globale" })}
            </h4>
            <AddLineForm onCancel={() => setShowAddLine(null)} onAdd={(line) => handleAddLine("global", line)} />
          </div>
        )}
      </div>
    </div>
  );
};

const AddLineForm: React.FC<{ onCancel: () => void; onAdd: (l: Partial<QuoteManualLine>) => void }> = ({
  onCancel,
  onAdd,
}) => {
  const { t } = useTranslation();

  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<QuoteManualLine["category"]>("labor");
  const [unit, setUnit] = useState<Unit>(Unit.PIECE);

  const handleSubmit = () => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (!label.trim() || Number.isNaN(q) || Number.isNaN(p)) return;

    onAdd({
      label: label.trim(),
      quantity: q,
      unitPrice: p,
      category: type,
      unit,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
      <div className="col-span-2">
        <input
          autoFocus
          type="text"
          placeholder={t("quote.addline.label", { defaultValue: "Désignation" })}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
        />
      </div>

      <div className="flex space-x-2">
        <input
          type="number"
          placeholder={t("quote.addline.qty", { defaultValue: "Qté" })}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20 p-2 border rounded bg-white text-slate-900 text-sm"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
        >
          <option value={Unit.PIECE}>{t("units.piece", { defaultValue: "Unité" })}</option>
          <option value={Unit.HOUR}>{t("units.hour", { defaultValue: "Heures" })}</option>
          <option value={Unit.DAY}>{t("units.day", { defaultValue: "Jours" })}</option>
          <option value={Unit.PACKAGE}>{t("units.package", { defaultValue: "Forfait" })}</option>
          <option value={Unit.M2}>{t("units.m2", { defaultValue: "m²" })}</option>
        </select>
      </div>

      <div className="flex space-x-2">
        <input
          type="number"
          placeholder={t("quote.addline.unit_price", { defaultValue: "Prix unitaire" })}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
        >
          <option value="labor">{t("quote.addline.type_labor", { defaultValue: "Main d'œuvre" })}</option>
          <option value="material">{t("quote.addline.type_material", { defaultValue: "Matériel" })}</option>
          <option value="service">{t("quote.addline.type_service", { defaultValue: "Service" })}</option>
        </select>
      </div>

      <div className="col-span-2 flex justify-end space-x-2 mt-2">
        <button onClick={onCancel} type="button" className="px-3 py-1.5 text-xs font-extrabold text-slate-500">
          {t("common.cancel", { defaultValue: "Annuler" })}
        </button>
        <button onClick={handleSubmit} type="button" className="px-3 py-1.5 text-xs font-extrabold bg-blue-600 text-white rounded">
          {t("common.save", { defaultValue: "Enregistrer" })}
        </button>
      </div>
    </div>
  );
};