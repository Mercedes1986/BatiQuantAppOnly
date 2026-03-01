import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getQuote,
  saveQuote,
  deleteQuote,
  getCompanyProfile,
} from "../../services/documentsStorage";
import { convertQuoteToInvoice, recalculateTotals } from "../../services/documentLogic";
import { QuoteDocument, DocumentLine, CompanyProfile } from "../../types";
import {
  ArrowLeft,
  Save,
  Printer,
  Trash2,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building2,
} from "lucide-react";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export const QuoteEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<QuoteDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  const [saveFlash, setSaveFlash] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const q = getQuote(id);
    if (q) setQuote(q);
    else navigate("/app/house");

    setCompany(getCompanyProfile());
  }, [id, navigate]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const handleSave = useCallback(() => {
    if (!quote) return;

    const updated = recalculateTotals(quote) as QuoteDocument;
    saveQuote(updated);
    setQuote(updated);

    setSaveFlash(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveFlash(false), 900);
  }, [quote]);

  const handlePrint = useCallback(() => {
    if (!quote) return;
    handleSave();
    navigate(`/app/print/quote/${quote.id}`);
  }, [handleSave, navigate, quote]);

  const handleDelete = useCallback(() => {
    if (!quote) return;
    const ok = window.confirm(t("quote.confirm_delete", { defaultValue: "Supprimer définitivement ce devis ?" }));
    if (!ok) return;

    deleteQuote(quote.id);
    navigate(-1);
  }, [navigate, quote, t]);

  const handleConvertToInvoice = useCallback(() => {
    if (!quote) return;

    const ok = window.confirm(t("quote.confirm_convert", { defaultValue: "Créer une facture à partir de ce devis ?" }));
    if (!ok) return;

    handleSave();
    const invoiceId = convertQuoteToInvoice(quote.id);
    if (invoiceId) navigate(`/app/invoices/${invoiceId}`);
  }, [handleSave, navigate, quote, t]);

  const updateLine = useCallback(
    (lineId: string, field: keyof DocumentLine, val: unknown) => {
      if (!quote) return;
      const newLines = quote.lines.map((l) => (l.id === lineId ? { ...l, [field]: val } : l));
      setQuote({ ...quote, lines: newLines });
    },
    [quote]
  );

  const deleteLine = useCallback(
    (lineId: string) => {
      if (!quote) return;
      setQuote({ ...quote, lines: quote.lines.filter((l) => l.id !== lineId) });
    },
    [quote]
  );

  const vatPct = useMemo(() => {
    if (!quote) return 0;
    const ht = Number(quote.totalHT) || 0;
    const vat = Number(quote.totalVAT) || 0;
    if (ht <= 0) return 0;
    return (vat / ht) * 100;
  }, [quote]);

  if (!quote) return <div className="p-10 text-center text-slate-500">{t("common.loading", { defaultValue: "Chargement..." })}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
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
              <h1 className="text-lg font-bold text-slate-800 flex items-center">{quote.number}</h1>
              <p className="text-xs text-slate-500">
                {company?.name || t("company.default_name", { defaultValue: "Mon Entreprise" })} &bull;{" "}
                {new Date(quote.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            id="save-btn"
            type="button"
            onClick={handleSave}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors font-bold text-sm ${
              saveFlash ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <Save size={18} className="mr-2" /> {t("common.save", { defaultValue: "Sauvegarder" })}
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
        {/* Actions Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide text-[10px]">
              {t("quote.state", { defaultValue: "État du document" })}
            </span>

            <select
              value={quote.status}
              onChange={(e) => setQuote({ ...quote, status: e.target.value as any })}
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">{t("quote.status.draft", { defaultValue: "Brouillon" })}</option>
              <option value="sent">{t("quote.status.sent", { defaultValue: "Envoyé" })}</option>
              <option value="accepted">{t("quote.status.accepted", { defaultValue: "Accepté" })}</option>
              <option value="rejected">{t("quote.status.rejected", { defaultValue: "Refusé" })}</option>
              <option value="invoiced">{t("quote.status.invoiced", { defaultValue: "Facturé" })}</option>
            </select>
          </div>

          <div className="flex gap-2">
            {quote.status === "accepted" && (
              <button
                type="button"
                onClick={handleConvertToInvoice}
                className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <FileText size={16} className="mr-1" /> {t("quote.convert", { defaultValue: "Convertir en Facture" })}
              </button>
            )}

            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              aria-label={t("common.delete", { defaultValue: "Supprimer" })}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Client Info Edit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase flex items-center">
            <Building2 className="mr-2 text-blue-600" size={18} />
            {t("client.info", { defaultValue: "Informations Client" })}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  {t("client.name", { defaultValue: "Nom / Raison Sociale" })}
                </label>
                <input
                  value={quote.client.name}
                  onChange={(e) => setQuote({ ...quote, client: { ...quote.client, name: e.target.value } })}
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
                      value={quote.client.phone || ""}
                      onChange={(e) => setQuote({ ...quote, client: { ...quote.client, phone: e.target.value } })}
                      className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                      placeholder={t("client.phone", { defaultValue: "Téléphone" })}
                    />
                  </div>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      value={quote.client.email || ""}
                      onChange={(e) => setQuote({ ...quote, client: { ...quote.client, email: e.target.value } })}
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
                    value={quote.client.address}
                    onChange={(e) => setQuote({ ...quote, client: { ...quote.client, address: e.target.value } })}
                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm"
                    placeholder={t("client.address.placeholder", { defaultValue: "N° et Rue" })}
                  />
                </div>
                <input
                  value={quote.client.zip}
                  onChange={(e) => setQuote({ ...quote, client: { ...quote.client, zip: e.target.value } })}
                  className="p-2.5 border border-slate-300 rounded-lg text-sm w-24 text-center"
                  placeholder={t("client.zip", { defaultValue: "CP" })}
                />
                <input
                  value={quote.client.city}
                  onChange={(e) => setQuote({ ...quote, client: { ...quote.client, city: e.target.value } })}
                  className="p-2.5 border border-slate-300 rounded-lg text-sm flex-1"
                  placeholder={t("client.city", { defaultValue: "Ville" })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lines Editor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pl-6 w-[50%]">{t("doc.line.desc", { defaultValue: "Désignation" })}</th>
                <th className="p-4 w-[15%] text-center">{t("doc.line.qty", { defaultValue: "Qté" })}</th>
                <th className="p-4 w-[15%] text-right">{t("doc.line.unit_price", { defaultValue: "P.U." })}</th>
                <th className="p-4 w-[15%] text-right">{t("doc.line.total", { defaultValue: "Total" })}</th>
                <th className="w-[5%]" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {quote.lines.map((line) => (
                <tr key={line.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="p-2 pl-4">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      className={`w-full bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all ${
                        line.unitPrice === 0
                          ? "font-bold text-slate-800 mt-2 uppercase text-xs tracking-wider"
                          : "text-slate-700"
                      }`}
                    />
                  </td>

                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, "quantity", toNum(e.target.value, 0))}
                        className="w-full text-center bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>

                  <td className="p-2">
                    {line.unitPrice !== 0 && (
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.id, "unitPrice", toNum(e.target.value, 0))}
                        className="w-full text-right bg-transparent outline-none rounded p-2 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </td>

                  <td className="p-4 text-right font-bold text-slate-800">
                    {line.unitPrice !== 0 ? (toNum(line.quantity, 0) * toNum(line.unitPrice, 0)).toFixed(2) : ""}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => deleteLine(line.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded hover:bg-red-50"
                      aria-label={t("common.delete", { defaultValue: "Supprimer" })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col items-end gap-1">
            <div className="flex justify-between w-64 text-sm text-slate-500">
              <span>{t("doc.total_ht", { defaultValue: "Total HT" })}</span>
              <span className="font-medium text-slate-700">{quote.totalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between w-64 text-sm text-slate-500">
              <span>{t("doc.vat", { defaultValue: "TVA" })} ({vatPct.toFixed(1)}%)</span>
              <span className="font-medium text-slate-700">{quote.totalVAT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between w-64 text-xl font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
              <span>{t("doc.total_ttc", { defaultValue: "Total TTC" })}</span>
              <span className="text-blue-600">{quote.totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-2 text-xs uppercase tracking-wide">
            {t("doc.notes_title", { defaultValue: "Notes & Conditions de paiement" })}
          </h3>
          <textarea
            value={quote.notes || ""}
            onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300"
            placeholder={t("doc.notes_placeholder", { defaultValue: "Ex: Acompte de 30% à la commande..." })}
          />
        </div>
      </div>
    </div>
  );
};