
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getQuote, getInvoice, getCompanyProfile } from "../../services/documentsStorage";
import { BaseDocument, CompanyProfile } from "../../types";

type FontFaceSetLike = {
  ready: Promise<unknown>;
};

const hasFontReady = (doc: Document): doc is Document & { fonts: FontFaceSetLike } => {
  return typeof (doc as any).fonts?.ready?.then === "function";
};


const localizeLegacyLineDescription = (description: string, t: (key: string, options?: any) => string) => {
  const translated: Record<string, string> = {
    "Foundation concrete (C25/30)": t("calc.foundations.mat.foundation_concrete", { defaultValue: "Foundation concrete (C25/30)" }),
    "Steel (average ratio)": t("calc.foundations.mat.steel", { defaultValue: "Steel (average ratio)" }),
    "Excavation": t("calc.foundations.mat.excavation", { defaultValue: "Excavation" }),
    "Blinding concrete": t("calc.foundations.mat.clean_concrete", { defaultValue: "Blinding concrete" }),
    "Formwork": t("calc.foundations.mat.formwork", { defaultValue: "Formwork" }),
    "Soil disposal": t("calc.foundations.mat.evac", { defaultValue: "Soil disposal" }),
    "Drain pipe": t("calc.foundations.mat.drain", { defaultValue: "Drain pipe" }),
    "Drain gravel": t("calc.foundations.mat.drain_gravel", { defaultValue: "Drain gravel" }),
    "Geotextile (drain)": t("calc.foundations.mat.geotextile", { defaultValue: "Geotextile (drain)" }),
  };
  return translated[description] ?? description;
};

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


export const PrintDocumentPage: React.FC = () => {
  const { t } = useTranslation();
  const { type, id } = useParams<{ type: string; id: string }>();

  const [doc, setDoc] = useState<BaseDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (!id || !type) return;
    const d = type === "quote" ? getQuote(id) : getInvoice(id);
    if (d) setDoc(d);
    setCompany(getCompanyProfile());
  }, [id, type]);

  const isQuote = useMemo(() => type === "quote", [type]);

  const localizedDoc = useMemo(() => {
    if (!doc) return null;
    return {
      ...doc,
      lines: doc.lines.map((line) => ({ ...line, description: localizeLegacyLineDescription(line.description, t) })),
      notes: localizeLegacyNotes(doc.notes, t),
    };
  }, [doc, t]);

  useEffect(() => {
    if (!doc || !company) return;

    let cancelled = false;
    let timer: number | undefined;

    const run = async () => {
      try {
        if (hasFontReady(document)) {
          await document.fonts.ready;
        }
      } catch {
        // ignore
      }

      // petit délai pour laisser le rendu + images se stabiliser
      timer = window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 600);
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [doc, company]);

  if (!localizedDoc || !company) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t("common.loading_document", { defaultValue: "Chargement du document..." })}
      </div>
    );
  }

  const vatPct = localizedDoc.totalHT > 0 ? (localizedDoc.totalVAT / localizedDoc.totalHT) * 100 : 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans print:p-0 p-8 max-w-[210mm] mx-auto box-border">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
        {/* Company Info (Left) */}
        <div className="flex-1 pr-8">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={t("company.logo", { defaultValue: "Logo" })}
              className="h-24 max-w-[200px] object-contain mb-4"
            />
          ) : (
            <h1 className="text-3xl font-extrabold uppercase mb-2 text-slate-800 tracking-tight">
              {company.name}
            </h1>
          )}

          <div className="text-sm text-slate-600 leading-snug space-y-1">
            {company.logoUrl && <p className="font-bold text-slate-800 text-lg mb-1">{company.name}</p>}
            <p>{company.address}</p>
            <p>
              {company.zip} {company.city}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 w-32"></div>
            <p>{t("company.phone", { defaultValue: "Tél" })}: {company.phone}</p>
            <p>{t("company.email", { defaultValue: "Email" })}: {company.email}</p>
            <p>SIRET: {company.siret}</p>
            {company.tvaNumber ? <p>TVA: {company.tvaNumber}</p> : null}
          </div>
        </div>

        {/* Client Info (Right) */}
        <div className="w-[300px]">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {t("doc.recipient", { defaultValue: "Destinataire" })}
            </h3>
            <div className="text-base text-slate-800 leading-relaxed">
              <p className="font-bold text-lg">{localizedDoc.client.name}</p>
              <p>{localizedDoc.client.address}</p>
              <p>
                {localizedDoc.client.zip} {localizedDoc.client.city}
              </p>
              {localizedDoc.client.phone ? <p className="text-sm text-slate-500 mt-2">{localizedDoc.client.phone}</p> : null}
              {localizedDoc.client.email ? <p className="text-sm text-slate-500">{localizedDoc.client.email}</p> : null}
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT TITLE & META */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <span className="block text-sm font-bold text-blue-600 uppercase tracking-wide mb-1">
            {isQuote
              ? t("doc.quote_title", { defaultValue: "Devis Client" })
              : t("doc.invoice_title", { defaultValue: "Facture Client" })}
          </span>
          <h2 className="text-4xl font-bold text-slate-900">
            {t("doc.number_prefix", { defaultValue: "N°" })} {localizedDoc.number}
          </h2>
        </div>

        <div className="text-right text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-400">
              {t("doc.issue_date", { defaultValue: "Date d'émission" })} :
            </span>{" "}
            {new Date(localizedDoc.date).toLocaleDateString()}
          </p>

          {"validUntil" in localizedDoc && (localizedDoc as any).validUntil ? (
            <p>
              <span className="font-medium text-slate-400">
                {t("doc.valid_until", { defaultValue: "Valable jusqu'au" })} :
              </span>{" "}
              {new Date((localizedDoc as any).validUntil).toLocaleDateString()}
            </p>
          ) : null}

          {!isQuote && (localizedDoc as any).paymentDate ? (
            <p>
              <span className="font-medium text-slate-400">
                {t("invoice.payment_date", { defaultValue: "Date paiement" })} :
              </span>{" "}
              {new Date((localizedDoc as any).paymentDate).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>

      {/* LINES TABLE */}
      <table className="w-full text-sm mb-10 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800">
            <th className="text-left py-3 pr-4 font-bold text-slate-800 w-[55%]">
              {t("doc.line.desc", { defaultValue: "Désignation" })}
            </th>
            <th className="text-center py-3 font-bold text-slate-800 w-[15%]">
              {t("doc.line.qty", { defaultValue: "Quantité" })}
            </th>
            <th className="text-right py-3 font-bold text-slate-800 w-[15%]">
              {t("doc.line.unit_price_ht", { defaultValue: "P.U. HT" })}
            </th>
            <th className="text-right py-3 pl-4 font-bold text-slate-800 w-[15%]">
              {t("doc.line.total_ht", { defaultValue: "Total HT" })}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {localizedDoc.lines.map((line, idx) => (
            <tr
              key={idx}
              className={line.unitPrice === 0 ? "bg-slate-50 break-inside-avoid" : "break-inside-avoid"}
            >
              <td
                className={`py-3 pr-4 align-top ${
                  line.unitPrice === 0
                    ? "font-bold pt-6 text-slate-900 uppercase tracking-wide text-xs"
                    : "text-slate-700"
                }`}
              >
                {line.description}
              </td>
              <td className="text-center py-3 align-top text-slate-600">
                {line.unitPrice !== 0 ? `${line.quantity} ${line.unit}` : ""}
              </td>
              <td className="text-right py-3 align-top text-slate-600">
                {line.unitPrice !== 0 ? `${Number(line.unitPrice).toFixed(2)} €` : ""}
              </td>
              <td className="text-right py-3 pl-4 align-top font-bold text-slate-800">
                {line.unitPrice !== 0 ? `${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)} €` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS SECTION */}
      <div className="flex justify-end mb-16 break-inside-avoid">
        <div className="w-[300px] bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between mb-3 text-sm text-slate-600">
            <span>{t("doc.total_ht", { defaultValue: "Total HT" })}</span>
            <span className="font-bold">{localizedDoc.totalHT.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between mb-4 text-sm text-slate-600 border-b border-slate-200 pb-4">
            <span>{t("doc.vat", { defaultValue: "TVA" })} ({vatPct.toFixed(1)}%)</span>
            <span>{localizedDoc.totalVAT.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-slate-800">
              {t("doc.net_to_pay", { defaultValue: "NET À PAYER" })}
            </span>
            <span className="text-2xl font-bold text-blue-600">{localizedDoc.totalTTC.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-xs text-slate-500 mt-auto pt-8 border-t border-slate-200 break-inside-avoid">
        {localizedDoc.notes ? (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-bold text-slate-700 mb-1">
              {t("doc.notes", { defaultValue: "Notes / Conditions :" })}
            </p>
            <p className="whitespace-pre-line leading-relaxed">{localizedDoc.notes}</p>
          </div>
        ) : null}

        <div className="text-center space-y-1">
          <p className="font-bold text-slate-700">{company.name}</p>
          <p className="text-[10px] uppercase tracking-wide">
            {company.footerNote || `SIRET ${company.siret} - ${company.address} ${company.city}`}
          </p>
          <p className="text-[10px] text-slate-300 pt-2">
            {t("doc.generated_by", { defaultValue: "Document généré par BatiQuant" })}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};