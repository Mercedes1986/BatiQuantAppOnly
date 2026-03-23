import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getInvoice,
  saveInvoice,
  getCompanyProfile,
} from "../../services/documentsStorage";
import { recalculateTotals } from "../../services/documentLogic";
import { InvoiceDocument, DocumentLine, CompanyProfile } from "../../types";
import { localizeLegacyText } from "../../constants";
import { ArrowLeft, Save, Printer, Phone, Mail, MapPin, Building2 } from "lucide-react";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};



const localizeLegacyLineDescription = (description: string) => localizeLegacyText(String(description || ""));


const localizeLegacyNotes = (notes: string | undefined, t: (key: string, options?: any) => string) => {
  if (!notes) return notes || "";
  const pairs: Array<[string, string]> = [
    ["Double-check frost depth and soil conditions before sizing footings.", t("tips.foundations.1", { defaultValue: "Double-check frost depth and soil conditions before sizing footings." })],
    ["Keep reinforcement properly covered (concrete cover) to avoid corrosion.", t("tips.foundations.2", { defaultValue: "Keep reinforcement properly covered (concrete cover) to avoid corrosion." })],
    ["Plan access for the mixer truck/pump early (turning radius, hose path).", t("tips.foundations.3", { defaultValue: "Plan access for the mixer truck/pump early (turning radius, hose path)." })],
    ["Waterproofing should go on a clean, dry surface — and protect it with a drainage membrane.", t("tips.substructure.1", { defaultValue: "Waterproofing should go on a clean, dry surface — and protect it with a drainage membrane." })],
    ["Always include weep points/manholes for perimeter drains to allow inspection.", t("tips.substructure.2", { defaultValue: "Always include weep points/manholes for perimeter drains to allow inspection." })],
    ["On shuttering blocks, calculate fill concrete separately — it depends on the block type.", t("tips.substructure.3", { defaultValue: "On shuttering blocks, calculate fill concrete separately — it depends on the block type." })],
    ["Check bond pattern and keep joints consistent to reduce waste and improve alignment.", t("tips.walls.1", { defaultValue: "Check bond pattern and keep joints consistent to reduce waste and improve alignment." })],
    ["Don’t forget lintel bearings and horizontal ring beams where required.", t("tips.walls.2", { defaultValue: "Don’t forget lintel bearings and horizontal ring beams where required." })],
    ["Don't forget lintel bearings and horizontal ring beams where required.", t("tips.walls.2", { defaultValue: "Don't forget lintel bearings and horizontal ring beams where required." })],
    ["Compact in layers: most outdoor failures come from insufficient base preparation.", t("tips.exterior.1", { defaultValue: "Compact in layers: most outdoor failures come from insufficient base preparation." })],
    ["Add drainage considerations (slope away from buildings, permeable layers).", t("tips.exterior.2", { defaultValue: "Add drainage considerations (slope away from buildings, permeable layers)." })],
  ];
  let value = notes;
  for (const [src, localized] of pairs) value = value.split(src).join(localized);
  return value;
};

const localizeLegacyLines = (lines: DocumentLine[], t: (key: string, options?: any) => string) =>
  lines.map((line) => ({ ...line, description: localizeLegacyLineDescription(line.description) }));


export const InvoiceEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<InvoiceDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  const [saveFlash, setSaveFlash] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const doc = getInvoice(id);
    if (doc) setInvoice({ ...doc, lines: localizeLegacyLines(doc.lines, t), notes: localizeLegacyNotes(doc.notes, t) });
    else navigate("/app/house");

    setCompany(getCompanyProfile());
  }, [id, navigate]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const handleSave = useCallback(() => {
    if (!invoice) return;

    const updated = recalculateTotals(invoice) as InvoiceDocument;
    saveInvoice(updated);
    setInvoice(updated);

    setSaveFlash(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveFlash(false), 900);
  }, [invoice]);

  const handlePrint = useCallback(() => {
    if (!invoice) return;
    handleSave();
    navigate(`/app/print/invoice/${invoice.id}`);
  }, [handleSave, invoice, navigate]);

  const updateLine = useCallback(
    (lineId: string, field: keyof DocumentLine, val: unknown) => {
      if (!invoice) return;

      const newLines = invoice.lines.map((l) =>
        l.id === lineId ? { ...l, [field]: val } : l
      );

      setInvoice({ ...invoice, lines: newLines });
    },
    [invoice]
  );

  const vatPct = useMemo(() => {
    if (!invoice) return 0;
    const ht = Number(invoice.totalHT) || 0;
    const vat = Number(invoice.totalVAT) || 0;
    if (ht <= 0) return 0;
    return (vat / ht) * 100;
  }, [invoice]);

  if (!invoice) {
    return <div className="p-10 text-center">{t("common.loading", { defaultValue: "Chargement..." })}</div>;
  }

  return (
    <div className="min-h-full bg-transparent safe-bottom-offset">
      {/* Sticky Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-3 text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors"
            aria-label={t("common.back", { defaultValue: "Retour" })}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={t("company.logo", { defaultValue: "Logo" })}
                className="h-8 w-8 object-contain mr-3 rounded border border-slate-100"
              />
            ) : null}

            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center">{invoice.number}</h1>
              <p className="text-xs text-slate-500">
                {company?.name || t("company.default_name", { defaultValue: "Mon Entreprise" })} &bull;{" "}
                {new Date(invoice.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors font-bold text-sm ${
              saveFlash ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <Save size={18} className="mr-2" />
            {t("common.save", { defaultValue: "Sauvegarder" })}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-md"
            aria-label={t("common.print", { defaultValue: "Imprimer" })}
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide text-[10px]">
              {t("invoice.status_label", { defaultValue: "Status" })}
            </span>
            <select
              value={invoice.status}
              onChange={(e) => setInvoice({ ...invoice, status: e.target.value as any })}
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">{t("invoice.status.draft", { defaultValue: "Brouillon" })}</option>
              <option value="sent">{t("invoice.status.sent", { defaultValue: "Envoyée" })}</option>
              <option value="paid">{t("invoice.status.paid", { defaultValue: "Payée" })}</option>
              <option value="late">{t("invoice.status.late", { defaultValue: "En retard" })}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {t("invoice.payment_date", { defaultValue: "Date Paiement" })}
            </span>
            <input
              type="date"
              value={invoice.paymentDate || ""}
              onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })}
              className="border border-slate-300 rounded-lg p-1.5 text-sm"
            />
          </div>
        </div>

        {/* Client Info Edit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase flex items-center">
            <Building2 className="mr-2 text-emerald-600" size={18} />
            {t("client.info", { defaultValue: "Informations Client" })}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  {t("client.name_label", { defaultValue: "Nom / Raison Sociale" })}
                </label>
                <input
                  value={invoice.client.name}
                  onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-colors"
                  placeholder={t("client.name.placeholder", { defaultValue: "Ex: M. Dupont" })}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  {t("client.contact", { defaultValue: "Contact" })}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      value={invoice.client.phone || ""}
                      onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, phone: e.target.value } })}
                      className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                      placeholder={t("client.phone", { defaultValue: "Téléphone" })}
                    />
                  </div>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      value={invoice.client.email || ""}
                      onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
                      className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                      placeholder={t("client.email", { defaultValue: "Email" })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {t("client.address_full", { defaultValue: "Adresse Complète" })}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={invoice.client.address}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, address: e.target.value } })}
                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                    placeholder={t("client.address.placeholder", { defaultValue: "N° et Rue" })}
                  />
                </div>
                <input
                  value={invoice.client.zip}
                  onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, zip: e.target.value } })}
                  className="p-2.5 border border-slate-300 rounded-lg text-sm w-24 text-center"
                  placeholder={t("client.zip", { defaultValue: "CP" })}
                />
                <input
                  value={invoice.client.city}
                  onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, city: e.target.value } })}
                  className="p-2.5 border border-slate-300 rounded-lg text-sm flex-1"
                  placeholder={t("client.city", { defaultValue: "Ville" })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lines View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-[50%]">{t("doc.line.desc", { defaultValue: "Désignation" })}</th>
                <th className="p-4 w-[15%] text-center">{t("doc.line.qty", { defaultValue: "Qté" })}</th>
                <th className="p-4 w-[15%] text-right">{t("doc.line.unit_price", { defaultValue: "P.U." })}</th>
                <th className="p-4 w-[15%] text-right">{t("doc.line.total", { defaultValue: "Total" })}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="p-2 pl-4">
                    <span
                      className={`block ${
                        line.unitPrice === 0
                          ? "font-bold mt-2 uppercase text-xs tracking-wider text-slate-800"
                          : "text-slate-700"
                      }`}
                    >
                      {line.description}
                    </span>
                  </td>

                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, "quantity", toNum(e.target.value, 0))}
                        className="w-full text-center bg-slate-50 rounded border border-transparent hover:border-blue-200 p-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>

                  <td className="p-2 text-right text-slate-600">
                    {line.unitPrice !== 0 ? Number(line.unitPrice).toFixed(2) : ""}
                  </td>

                  <td className="p-4 text-right font-bold text-slate-800">
                    {line.unitPrice !== 0 ? (toNum(line.quantity, 0) * toNum(line.unitPrice, 0)).toFixed(2) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col items-end gap-1">
            <div className="flex justify-between w-64 text-sm text-slate-500">
              <span>{t("doc.total_ht", { defaultValue: "Total HT" })}</span>
              <span className="font-medium text-slate-700">{invoice.totalHT.toFixed(2)} €</span>
            </div>

            <div className="flex justify-between w-64 text-sm text-slate-500">
              <span>{t("doc.vat", { defaultValue: "TVA" })} ({vatPct.toFixed(1)}%)</span>
              <span className="font-medium text-slate-700">{invoice.totalVAT.toFixed(2)} €</span>
            </div>

            <div className="flex justify-between w-64 text-xl font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
              <span>{t("doc.total_ttc", { defaultValue: "Total TTC" })}</span>
              <span className="text-blue-600">{invoice.totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};