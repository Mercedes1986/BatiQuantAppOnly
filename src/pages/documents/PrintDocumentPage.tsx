import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer } from "lucide-react";

import { getQuote, getInvoice, getCompanyProfile } from "../../services/documentsStorage";
import { BaseDocument, CompanyProfile } from "../../types";
import { localizeLegacyText } from "../../constants";

type FontFaceSetLike = {
  ready: Promise<unknown>;
};

const hasFontReady = (doc: Document): doc is Document & { fonts: FontFaceSetLike } => {
  return typeof (doc as any).fonts?.ready?.then === "function";
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

export const PrintDocumentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();

  const [doc, setDoc] = useState<BaseDocument | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (!id || !type) return;
    const loaded = type === "quote" ? getQuote(id) : getInvoice(id);
    if (loaded) setDoc(loaded);
    setCompany(getCompanyProfile());
  }, [id, type]);

  const isQuote = useMemo(() => type === "quote", [type]);

  const localizedDoc = useMemo(() => {
    if (!doc) return null;
    return {
      ...doc,
      lines: doc.lines.map((line) => ({ ...line, description: localizeLegacyLineDescription(line.description) })),
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
        // ignore font readiness issues
      }

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (type === "quote") {
      navigate(id ? `/app/quotes/${id}` : "/app/quotes");
      return;
    }

    navigate(id ? `/app/invoices/${id}` : "/app/menu");
  };

  if (!localizedDoc || !company) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t("common.loading_document", { defaultValue: "Chargement du document..." })}
      </div>
    );
  }

  const vatPct = localizedDoc.totalHT > 0 ? (localizedDoc.totalVAT / localizedDoc.totalHT) * 100 : 0;

  return (
    <div className="mx-auto min-h-screen max-w-[210mm] box-border bg-white p-4 font-sans text-slate-900 print:p-0 md:p-8">
      <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
        >
          <ArrowLeft size={18} />
          {t("common.back", { defaultValue: "Retour" })}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          <Printer size={18} />
          {t("common.print", { defaultValue: "Imprimer" })}
        </button>
      </div>

      <div className="mb-12 flex items-start justify-between border-b border-slate-100 pb-8">
        <div className="flex-1 pr-8">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={t("company.logo", { defaultValue: "Logo" })}
              className="mb-4 h-24 max-w-[200px] object-contain"
            />
          ) : (
            <h1 className="mb-2 text-3xl font-extrabold uppercase tracking-tight text-slate-800">{company.name}</h1>
          )}

          <div className="space-y-1 text-sm leading-snug text-slate-600">
            {company.logoUrl && <p className="mb-1 text-lg font-bold text-slate-800">{company.name}</p>}
            <p>{company.address}</p>
            <p>
              {company.zip} {company.city}
            </p>
            <div className="mt-3 w-32 border-t border-slate-100 pt-3"></div>
            <p>{t("company.phone", { defaultValue: "Tél" })}: {company.phone}</p>
            <p>{t("company.email", { defaultValue: "Email" })}: {company.email}</p>
            <p>SIRET: {company.siret}</p>
            {company.tvaNumber ? <p>TVA: {company.tvaNumber}</p> : null}
          </div>
        </div>

        <div className="w-[300px]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("doc.recipient", { defaultValue: "Destinataire" })}
            </h3>
            <div className="text-base leading-relaxed text-slate-800">
              <p className="text-lg font-bold">{localizedDoc.client.name}</p>
              <p>{localizedDoc.client.address}</p>
              <p>
                {localizedDoc.client.zip} {localizedDoc.client.city}
              </p>
              {localizedDoc.client.phone ? <p className="mt-2 text-sm text-slate-500">{localizedDoc.client.phone}</p> : null}
              {localizedDoc.client.email ? <p className="text-sm text-slate-500">{localizedDoc.client.email}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-blue-600">
            {isQuote
              ? t("doc.quote_title", { defaultValue: "Devis client" })
              : t("doc.invoice_title", { defaultValue: "Facture client" })}
          </span>
          <h2 className="text-4xl font-bold text-slate-900">
            {t("doc.number_prefix", { defaultValue: "N°" })} {localizedDoc.number}
          </h2>
        </div>

        <div className="text-right text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-400">{t("doc.issue_date", { defaultValue: "Date d'émission" })} :</span>{" "}
            {new Date(localizedDoc.date).toLocaleDateString()}
          </p>

          {"validUntil" in localizedDoc && (localizedDoc as any).validUntil ? (
            <p>
              <span className="font-medium text-slate-400">{t("doc.valid_until", { defaultValue: "Valable jusqu'au" })} :</span>{" "}
              {new Date((localizedDoc as any).validUntil).toLocaleDateString()}
            </p>
          ) : null}

          {!isQuote && (localizedDoc as any).paymentDate ? (
            <p>
              <span className="font-medium text-slate-400">{t("invoice.payment_date", { defaultValue: "Date paiement" })} :</span>{" "}
              {new Date((localizedDoc as any).paymentDate).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>

      <table className="mb-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-800">
            <th className="w-[55%] py-3 pr-4 text-left font-bold text-slate-800">{t("doc.line.desc", { defaultValue: "Désignation" })}</th>
            <th className="w-[15%] py-3 text-center font-bold text-slate-800">{t("doc.line.qty", { defaultValue: "Quantité" })}</th>
            <th className="w-[15%] py-3 text-right font-bold text-slate-800">{t("doc.line.unit_price_ht", { defaultValue: "P.U. HT" })}</th>
            <th className="w-[15%] py-3 pl-4 text-right font-bold text-slate-800">{t("doc.line.total_ht", { defaultValue: "Total HT" })}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {localizedDoc.lines.map((line, idx) => (
            <tr key={idx} className={line.unitPrice === 0 ? "break-inside-avoid bg-slate-50" : "break-inside-avoid"}>
              <td
                className={`py-3 pr-4 align-top ${
                  line.unitPrice === 0 ? "pt-6 text-xs font-bold uppercase tracking-wide text-slate-900" : "text-slate-700"
                }`}
              >
                {line.description}
              </td>
              <td className="py-3 text-center align-top text-slate-600">
                {line.unitPrice !== 0 ? `${line.quantity} ${line.unit}` : ""}
              </td>
              <td className="py-3 text-right align-top text-slate-600">
                {line.unitPrice !== 0 ? `${Number(line.unitPrice).toFixed(2)} €` : ""}
              </td>
              <td className="py-3 pl-4 text-right align-top font-bold text-slate-800">
                {line.unitPrice !== 0 ? `${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)} €` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-16 flex justify-end break-inside-avoid">
        <div className="w-[300px] rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="mb-3 flex justify-between text-sm text-slate-600">
            <span>{t("doc.total_ht", { defaultValue: "Total HT" })}</span>
            <span className="font-bold">{localizedDoc.totalHT.toFixed(2)} €</span>
          </div>
          <div className="mb-4 flex justify-between border-b border-slate-200 pb-4 text-sm text-slate-600">
            <span>{t("doc.vat", { defaultValue: "TVA" })} ({vatPct.toFixed(1)}%)</span>
            <span>{localizedDoc.totalVAT.toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-800">{t("doc.net_to_pay", { defaultValue: "NET À PAYER" })}</span>
            <span className="text-2xl font-bold text-blue-600">{localizedDoc.totalTTC.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-8 text-xs text-slate-500 break-inside-avoid">
        {localizedDoc.notes ? (
          <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 font-bold text-slate-700">{t("doc.notes", { defaultValue: "Notes / Conditions :" })}</p>
            <p className="whitespace-pre-line leading-relaxed">{localizedDoc.notes}</p>
          </div>
        ) : null}

        {company.terms ? (
          <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 font-bold text-slate-700">{t("doc.terms_conditions", { defaultValue: "Conditions générales" })}</p>
            <p className="whitespace-pre-line leading-relaxed">{company.terms}</p>
          </div>
        ) : null}

        <div className="space-y-1 text-center">
          <p className="font-bold text-slate-700">{company.name}</p>
          <p className="text-[10px] uppercase tracking-wide">{company.footerNote || `SIRET ${company.siret} - ${company.address} ${company.city}`}</p>
          <p className="pt-2 text-[10px] text-slate-300">{t("doc.generated_by", { defaultValue: "Document généré par BatiQuant" })}</p>
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
