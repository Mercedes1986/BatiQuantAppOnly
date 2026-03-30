import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Share2, Mail, Download } from "lucide-react";

import { getQuote, getInvoice, getCompanyProfile } from "../../services/documentsStorage";
import { BaseDocument, CompanyProfile } from "../../types";
import { localizeLegacyText } from "../../constants";
import { getNativeAdsBridge } from "../../services/platformService";

const localizeLegacyLineDescription = (description: string) =>
  localizeLegacyText(String(description || ""));

const localizeLegacyNotes = (
  notes: string | undefined,
  t: (key: string, options?: any) => string,
) => {
  if (!notes) return "";

  const pairs: Array<[string, string]> = [
    [
      "Double-check frost depth and soil conditions before sizing footings.",
      t("tips.foundations.1", {
        defaultValue: "Double-check frost depth and soil conditions before sizing footings.",
      }),
    ],
    [
      "Keep reinforcement properly covered (concrete cover) to avoid corrosion.",
      t("tips.foundations.2", {
        defaultValue: "Keep reinforcement properly covered (concrete cover) to avoid corrosion.",
      }),
    ],
    [
      "Plan access for the mixer truck/pump early (turning radius, hose path).",
      t("tips.foundations.3", {
        defaultValue: "Plan access for the mixer truck/pump early (turning radius, hose path).",
      }),
    ],
    [
      "Waterproofing should go on a clean, dry surface — and protect it with a drainage membrane.",
      t("tips.substructure.1", {
        defaultValue:
          "Waterproofing should go on a clean, dry surface — and protect it with a drainage membrane.",
      }),
    ],
    [
      "Always include weep points/manholes for perimeter drains to allow inspection.",
      t("tips.substructure.2", {
        defaultValue: "Always include weep points/manholes for perimeter drains to allow inspection.",
      }),
    ],
    [
      "On shuttering blocks, calculate fill concrete separately — it depends on the block type.",
      t("tips.substructure.3", {
        defaultValue:
          "On shuttering blocks, calculate fill concrete separately — it depends on the block type.",
      }),
    ],
    [
      "Check bond pattern and keep joints consistent to reduce waste and improve alignment.",
      t("tips.walls.1", {
        defaultValue:
          "Check bond pattern and keep joints consistent to reduce waste and improve alignment.",
      }),
    ],
    [
      "Don’t forget lintel bearings and horizontal ring beams where required.",
      t("tips.walls.2", {
        defaultValue: "Don’t forget lintel bearings and horizontal ring beams where required.",
      }),
    ],
    [
      "Don't forget lintel bearings and horizontal ring beams where required.",
      t("tips.walls.2", {
        defaultValue: "Don't forget lintel bearings and horizontal ring beams where required.",
      }),
    ],
    [
      "Compact in layers: most outdoor failures come from insufficient base preparation.",
      t("tips.exterior.1", {
        defaultValue:
          "Compact in layers: most outdoor failures come from insufficient base preparation.",
      }),
    ],
    [
      "Add drainage considerations (slope away from buildings, permeable layers).",
      t("tips.exterior.2", {
        defaultValue: "Add drainage considerations (slope away from buildings, permeable layers).",
      }),
    ],
  ];

  let value = notes;
  for (const [src, localized] of pairs) {
    value = value.split(src).join(localized);
  }
  return value;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const preserveLineBreaks = (value: string) => escapeHtml(value).replace(/\n/g, "<br />");

const safeDate = (value: string | undefined, fallback = "") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
};

const buildDocumentText = (
  doc: BaseDocument,
  company: CompanyProfile,
  labels: {
    docTitle: string;
    issueDate: string;
    validUntil: string;
    paymentDate: string;
    recipient: string;
    totalHT: string;
    vat: string;
    totalTTC: string;
    generatedBy: string;
  },
) => {
  const lines = doc.lines
    .filter((line) => Number(line.unitPrice) !== 0)
    .map(
      (line) =>
        `- ${line.description}: ${line.quantity} ${line.unit} × ${Number(line.unitPrice).toFixed(2)} € = ${(
          Number(line.quantity) * Number(line.unitPrice)
        ).toFixed(2)} €`,
    )
    .join("\n");

  const chunks = [
    `${labels.docTitle} ${doc.number}`,
    `${company.name}`,
    `${labels.issueDate}: ${safeDate(doc.date)}`,
    "",
    `${labels.recipient}: ${doc.client.name}`,
    `${doc.client.address}`,
    `${doc.client.zip} ${doc.client.city}`,
  ];

  if ((doc as any).validUntil) chunks.push(`${labels.validUntil}: ${safeDate((doc as any).validUntil)}`);
  if ((doc as any).paymentDate) chunks.push(`${labels.paymentDate}: ${safeDate((doc as any).paymentDate)}`);

  chunks.push(
    "",
    lines,
    "",
    `${labels.totalHT}: ${Number(doc.totalHT).toFixed(2)} €`,
    `${labels.vat}: ${Number(doc.totalVAT).toFixed(2)} €`,
    `${labels.totalTTC}: ${Number(doc.totalTTC).toFixed(2)} €`,
    "",
    `${labels.generatedBy} BatiQuant`,
  );

  return chunks.filter(Boolean).join("\n");
};

const buildDocumentHtml = (
  doc: BaseDocument,
  company: CompanyProfile,
  labels: {
    docTitle: string;
    recipient: string;
    issueDate: string;
    validUntil: string;
    paymentDate: string;
    desc: string;
    qty: string;
    unitPrice: string;
    totalHTCol: string;
    totalHT: string;
    vat: string;
    netToPay: string;
    notes: string;
    terms: string;
    generatedBy: string;
    numberPrefix: string;
  },
) => {
  const vatPct = doc.totalHT > 0 ? (doc.totalVAT / doc.totalHT) * 100 : 0;
  const issueDate = safeDate(doc.date);
  const validUntil = (doc as any).validUntil ? safeDate((doc as any).validUntil) : "";
  const paymentDate = (doc as any).paymentDate ? safeDate((doc as any).paymentDate) : "";

  const rows = doc.lines
    .map((line) => {
      const isSection = Number(line.unitPrice) === 0;
      return `
        <tr class="${isSection ? "section" : ""}">
          <td>${escapeHtml(line.description)}</td>
          <td class="center">${isSection ? "" : `${escapeHtml(line.quantity)} ${escapeHtml(line.unit)}`}</td>
          <td class="right">${isSection ? "" : `${Number(line.unitPrice).toFixed(2)} €`}</td>
          <td class="right strong">${
            isSection ? "" : `${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)} €`
          }</td>
        </tr>
      `;
    })
    .join("");

  const logo = company.logoUrl
    ? `<img src="${company.logoUrl}" alt="Logo" style="max-width:180px;max-height:92px;object-fit:contain;margin-bottom:16px;" />`
    : `<h1 style="margin:0 0 12px;font-size:28px;font-weight:800;letter-spacing:-0.03em;">${escapeHtml(company.name)}</h1>`;

  const notesBlock = doc.notes
    ? `
      <div class="note-box">
        <div class="note-title">${escapeHtml(labels.notes)}</div>
        <div>${preserveLineBreaks(doc.notes)}</div>
      </div>
    `
    : "";

  const termsBlock = company.terms
    ? `
      <div class="note-box">
        <div class="note-title">${escapeHtml(labels.terms)}</div>
        <div>${preserveLineBreaks(company.terms)}</div>
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(labels.docTitle)} ${escapeHtml(doc.number)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --soft: #f8fafc;
      --accent: #2563eb;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef2ff; color: var(--ink); font-family: Arial, Helvetica, sans-serif; }
    body { padding: 24px; }
    .page { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 28px; padding: 36px; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08); }
    .top { display: flex; gap: 24px; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
    .company, .recipient { flex: 1; }
    .recipient-card { border: 1px solid var(--line); background: var(--soft); border-radius: 18px; padding: 18px; }
    .meta-title { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin: 0 0 6px; }
    h2 { margin: 0; font-size: 34px; line-height: 1.1; }
    .muted { color: var(--muted); }
    .doc-head { display: flex; justify-content: space-between; gap: 20px; padding: 28px 0 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 12px 8px 12px 0; border-bottom: 2px solid var(--ink); }
    td { padding: 12px 8px 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .section td { background: var(--soft); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: 11px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .strong { font-weight: 700; }
    .totals { margin-left: auto; margin-top: 24px; width: 320px; border: 1px solid var(--line); background: var(--soft); border-radius: 18px; padding: 18px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; color: var(--muted); }
    .totals-main { display: flex; justify-content: space-between; gap: 16px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 18px; font-weight: 800; color: var(--ink); }
    .totals-main span:last-child { color: var(--accent); font-size: 28px; }
    .note-box { margin-top: 18px; border: 1px solid var(--line); background: var(--soft); border-radius: 14px; padding: 14px 16px; font-size: 13px; color: #475569; line-height: 1.55; }
    .note-title { font-weight: 700; color: var(--ink); margin-bottom: 6px; }
    .footer { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); text-align: center; }
    @media print {
      @page { size: A4; margin: 14mm; }
      html, body { background: white; }
      body { padding: 0; }
      .page { box-shadow: none; border-radius: 0; max-width: none; padding: 0; }
    }
    @media (max-width: 720px) {
      body { padding: 0; }
      .page { border-radius: 0; padding: 18px; }
      .top, .doc-head { display: block; }
      .recipient-card, .totals { width: 100%; margin-top: 16px; }
      h2 { font-size: 26px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="company">
        ${logo}
        ${company.logoUrl ? `<div style="font-size:20px;font-weight:800;margin-bottom:10px;">${escapeHtml(company.name)}</div>` : ""}
        <div class="muted" style="font-size:14px;line-height:1.6;">
          <div>${escapeHtml(company.address)}</div>
          <div>${escapeHtml(company.zip)} ${escapeHtml(company.city)}</div>
          <div style="margin-top:12px;">Tél: ${escapeHtml(company.phone)}</div>
          <div>Email: ${escapeHtml(company.email)}</div>
          <div>SIRET: ${escapeHtml(company.siret)}</div>
          ${company.tvaNumber ? `<div>TVA: ${escapeHtml(company.tvaNumber)}</div>` : ""}
        </div>
      </div>

      <div class="recipient">
        <div class="recipient-card">
          <div class="meta-title">${escapeHtml(labels.recipient)}</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;">${escapeHtml(doc.client.name)}</div>
          <div>${escapeHtml(doc.client.address)}</div>
          <div>${escapeHtml(doc.client.zip)} ${escapeHtml(doc.client.city)}</div>
          ${doc.client.phone ? `<div style="margin-top:10px;color:var(--muted);">${escapeHtml(doc.client.phone)}</div>` : ""}
          ${doc.client.email ? `<div style="color:var(--muted);">${escapeHtml(doc.client.email)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="doc-head">
      <div>
        <div class="meta-title">${escapeHtml(labels.docTitle)}</div>
        <h2>${escapeHtml(labels.numberPrefix)} ${escapeHtml(doc.number)}</h2>
      </div>
      <div class="muted" style="font-size:14px;line-height:1.7;text-align:right;">
        <div><strong>${escapeHtml(labels.issueDate)}:</strong> ${escapeHtml(issueDate)}</div>
        ${validUntil ? `<div><strong>${escapeHtml(labels.validUntil)}:</strong> ${escapeHtml(validUntil)}</div>` : ""}
        ${paymentDate ? `<div><strong>${escapeHtml(labels.paymentDate)}:</strong> ${escapeHtml(paymentDate)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:55%;">${escapeHtml(labels.desc)}</th>
          <th class="center" style="width:15%;">${escapeHtml(labels.qty)}</th>
          <th class="right" style="width:15%;">${escapeHtml(labels.unitPrice)}</th>
          <th class="right" style="width:15%;">${escapeHtml(labels.totalHTCol)}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>${escapeHtml(labels.totalHT)}</span><strong>${Number(doc.totalHT).toFixed(2)} €</strong></div>
      <div class="totals-row"><span>${escapeHtml(labels.vat)} (${vatPct.toFixed(1)}%)</span><strong>${Number(doc.totalVAT).toFixed(2)} €</strong></div>
      <div class="totals-main"><span>${escapeHtml(labels.netToPay)}</span><span>${Number(doc.totalTTC).toFixed(2)} €</span></div>
    </div>

    ${notesBlock}
    ${termsBlock}

    <div class="footer">
      <div style="font-weight:700;color:var(--ink);margin-bottom:6px;">${escapeHtml(company.name)}</div>
      <div>${escapeHtml(company.footerNote || `SIRET ${company.siret} - ${company.address} ${company.city}`)}</div>
      <div style="padding-top:10px;color:#cbd5e1;">${escapeHtml(labels.generatedBy)} BatiQuant</div>
    </div>
  </div>
</body>
</html>`;
};

export const PrintDocumentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [doc] = useState<BaseDocument | null>(() => {
    if (!id || !type) return null;
    const found = type === "quote" ? getQuote(id) : getInvoice(id);
    return (found ?? null) as BaseDocument | null;
  });

  const [company] = useState<CompanyProfile | null>(() => getCompanyProfile() ?? null);

  const isQuote = useMemo(() => type === "quote", [type]);

  const localizedDoc = useMemo(() => {
    if (!doc) return null;

    return {
      ...doc,
      lines: doc.lines.map((line) => ({
        ...line,
        description: localizeLegacyLineDescription(line.description),
      })),
      notes: localizeLegacyNotes(doc.notes, t),
    };
  }, [doc, t]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

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

  const labels = useMemo(
    () => ({
      docTitle: isQuote
        ? t("doc.quote_title", { defaultValue: "Devis" })
        : t("doc.invoice_title", { defaultValue: "Facture" }),
      recipient: t("doc.recipient", { defaultValue: "Destinataire" }),
      issueDate: t("doc.issue_date", { defaultValue: "Date d'émission" }),
      validUntil: t("doc.valid_until", { defaultValue: "Valable jusqu'au" }),
      paymentDate: t("invoice.payment_date", { defaultValue: "Date paiement" }),
      desc: t("doc.line.desc", { defaultValue: "Désignation" }),
      qty: t("doc.line.qty", { defaultValue: "Quantité" }),
      unitPrice: t("doc.line.unit_price_ht", { defaultValue: "P.U. HT" }),
      totalHTCol: t("doc.line.total_ht", { defaultValue: "Total HT" }),
      totalHT: t("doc.total_ht", { defaultValue: "Total HT" }),
      vat: t("doc.vat", { defaultValue: "TVA" }),
      totalTTC: t("doc.total_ttc", { defaultValue: "Total TTC" }),
      netToPay: t("doc.net_to_pay", { defaultValue: "NET À PAYER" }),
      notes: t("doc.notes", { defaultValue: "Notes / Conditions" }),
      terms: t("doc.terms_conditions", { defaultValue: "Conditions générales" }),
      generatedBy: t("doc.generated_by", { defaultValue: "Document généré par" }),
      numberPrefix: t("doc.number_prefix", { defaultValue: "N°" }),
    }),
    [isQuote, t],
  );

  const docTitle = labels.docTitle;

  const htmlContent = useMemo(() => {
    if (!localizedDoc || !company) return "";
    return buildDocumentHtml(localizedDoc, company, labels);
  }, [company, labels, localizedDoc]);

  const textContent = useMemo(() => {
    if (!localizedDoc || !company) return "";
    return buildDocumentText(localizedDoc, company, {
      docTitle,
      issueDate: labels.issueDate,
      validUntil: labels.validUntil,
      paymentDate: labels.paymentDate,
      recipient: labels.recipient,
      totalHT: labels.totalHT,
      vat: labels.vat,
      totalTTC: labels.netToPay,
      generatedBy: labels.generatedBy,
    });
  }, [company, docTitle, labels, localizedDoc]);

  const fileBaseName = useMemo(() => {
    if (!localizedDoc) return isQuote ? "devis-batiquant" : "facture-batiquant";
    const safeNumber = localizedDoc.number.replace(/[^a-zA-Z0-9_-]+/g, "_");
    return `${isQuote ? "Devis" : "Facture"}_${safeNumber}`;
  }, [isQuote, localizedDoc]);

  const emailSubject = useMemo(() => {
    if (!localizedDoc || !company) return docTitle;
    return `${docTitle} ${localizedDoc.number} - ${company.name}`;
  }, [company, docTitle, localizedDoc]);

  const nativeBridge = getNativeAdsBridge();

  const handlePrint = () => {
    if (!localizedDoc || !company) return;

    try {
      if (nativeBridge?.printHtmlDocument && htmlContent) {
        const success = nativeBridge.printHtmlDocument(emailSubject, htmlContent);
        if (success !== false) {
          setActionMessage(t("doc.print_opened", { defaultValue: "Fenêtre d'impression ouverte." }));
          return;
        }
      }
    } catch {
      // fallback below
    }

    window.print();
  };

  const handleShare = async () => {
    if (!localizedDoc || !company) return;

    try {
      if (nativeBridge?.shareHtmlDocument && htmlContent) {
        const success = nativeBridge.shareHtmlDocument(emailSubject, `${fileBaseName}.html`, htmlContent);
        if (success !== false) {
          setActionMessage(t("doc.share_opened", { defaultValue: "Partage ouvert." }));
          return;
        }
      }

      if (navigator.share) {
        await navigator.share({
          title: emailSubject,
          text: textContent,
        });
        return;
      }
    } catch {
      // browser fallback below
    }

    try {
      await navigator.clipboard.writeText(textContent);
      setActionMessage(
        t("doc.share_copied", {
          defaultValue: "Texte du document copié. Vous pouvez maintenant le coller où vous voulez.",
        }),
      );
    } catch {
      setActionMessage(t("doc.action_failed", { defaultValue: "Action indisponible sur cet appareil." }));
    }
  };

  const handleEmail = () => {
    if (!localizedDoc || !company) return;
    const to = localizedDoc.client.email || "";

    try {
      if (nativeBridge?.emailHtmlDocument && htmlContent) {
        const success = nativeBridge.emailHtmlDocument(
          to,
          emailSubject,
          textContent,
          `${fileBaseName}.html`,
          htmlContent,
        );
        if (success !== false) {
          setActionMessage(t("doc.email_opened", { defaultValue: "Préparation de l’e-mail ouverte." }));
          return;
        }
      }
    } catch {
      // fallback below
    }

    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
      textContent,
    )}`;
    window.location.href = mailto;
  };

  const handleDownload = () => {
    if (!localizedDoc || !company || !htmlContent) return;

    try {
      if (nativeBridge?.downloadHtmlDocument) {
        const success = nativeBridge.downloadHtmlDocument(`${fileBaseName}.html`, htmlContent);
        if (success !== false) {
          setActionMessage(
            t("doc.download_saved", {
              defaultValue: "Document enregistré sur votre appareil.",
            }),
          );
          return;
        }
      }
    } catch {
      // fallback below
    }

    try {
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileBaseName}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setActionMessage(
        t("doc.download_saved", {
          defaultValue: "Document enregistré sur votre appareil.",
        }),
      );
    } catch {
      setActionMessage(t("doc.action_failed", { defaultValue: "Action indisponible sur cet appareil." }));
    }
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
    <div
      className="bg-[linear-gradient(180deg,#cfd7ff_0%,#eef2ff_28%,#f8fafc_100%)] print:bg-white"
      style={{
        paddingTop: "calc(var(--app-top-gap, 18px) + 8px)",
        paddingRight: "12px",
        paddingBottom: "calc(var(--bottom-nav-space, 96px) + 12px)",
        paddingLeft: "12px",
      }}
    >
      <div
        className="mx-auto flex max-w-[210mm] min-h-0 flex-col print:block"
        style={{
          height: "calc(100dvh - var(--app-top-gap, 18px) - var(--bottom-nav-space, 96px) - 20px)",
        }}
      >
        <div className="no-print mb-3 rounded-[28px] border border-white/50 bg-white/72 p-3 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              {t("common.back", { defaultValue: "Retour" })}
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
              >
                <Share2 size={16} />
                {t("common.share", { defaultValue: "Partager" })}
              </button>

              <button
                type="button"
                onClick={handleEmail}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
              >
                <Mail size={16} />
                {t("common.email", { defaultValue: "Envoyer par mail" })}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
              >
                <Download size={16} />
                {t("common.download", { defaultValue: "Télécharger" })}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Printer size={16} />
                {t("common.print", { defaultValue: "Imprimer" })}
              </button>
            </div>
          </div>

          {actionMessage ? (
            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              {actionMessage}
            </div>
          ) : null}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[30px] border border-white/60 bg-white p-5 font-sans text-slate-900 shadow-sm print:h-auto print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none md:p-8"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <div className="mb-10 flex flex-col gap-6 border-b border-slate-100 pb-8 md:mb-12 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 md:pr-8">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={t("company.logo", { defaultValue: "Logo" })}
                  className="mb-4 h-20 max-w-[180px] object-contain md:h-24 md:max-w-[200px]"
                />
              ) : (
                <h1 className="mb-2 text-2xl font-extrabold uppercase tracking-tight text-slate-800 md:text-3xl">
                  {company.name}
                </h1>
              )}

              <div className="space-y-1 text-xs leading-snug text-slate-600 md:text-sm">
                {company.logoUrl && (
                  <p className="mb-1 text-base font-bold text-slate-800 md:text-lg">{company.name}</p>
                )}
                <p>{company.address}</p>
                <p>
                  {company.zip} {company.city}
                </p>
                <div className="mt-3 w-32 border-t border-slate-100 pt-3" />
                <p>
                  {t("company.phone", { defaultValue: "Tél" })}: {company.phone}
                </p>
                <p>
                  {t("company.email", { defaultValue: "Email" })}: {company.email}
                </p>
                <p>SIRET: {company.siret}</p>
                {company.tvaNumber ? <p>TVA: {company.tvaNumber}</p> : null}
              </div>
            </div>

            <div className="w-full md:w-[300px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:text-xs">
                  {t("doc.recipient", { defaultValue: "Destinataire" })}
                </h3>
                <div className="text-sm leading-relaxed text-slate-800 md:text-base">
                  <p className="text-base font-bold md:text-lg">{localizedDoc.client.name}</p>
                  <p>{localizedDoc.client.address}</p>
                  <p>
                    {localizedDoc.client.zip} {localizedDoc.client.city}
                  </p>
                  {localizedDoc.client.phone ? (
                    <p className="mt-2 text-xs text-slate-500 md:text-sm">{localizedDoc.client.phone}</p>
                  ) : null}
                  {localizedDoc.client.email ? (
                    <p className="text-xs text-slate-500 md:text-sm">{localizedDoc.client.email}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-blue-600 md:text-sm">
                {isQuote
                  ? t("doc.quote_title", { defaultValue: "Devis client" })
                  : t("doc.invoice_title", { defaultValue: "Facture client" })}
              </span>
              <h2 className="text-2xl font-bold leading-tight text-slate-900 md:text-4xl">
                {t("doc.number_prefix", { defaultValue: "N°" })} {localizedDoc.number}
              </h2>
            </div>

            <div className="text-left text-xs text-slate-600 md:text-right md:text-sm">
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

          <div className="overflow-x-auto">
            <table className="mb-10 min-w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="min-w-[220px] py-3 pr-4 text-left font-bold text-slate-800 md:w-[55%]">
                    {t("doc.line.desc", { defaultValue: "Désignation" })}
                  </th>
                  <th className="min-w-[70px] py-3 text-center font-bold text-slate-800 md:w-[15%]">
                    {t("doc.line.qty", { defaultValue: "Quantité" })}
                  </th>
                  <th className="min-w-[80px] py-3 text-right font-bold text-slate-800 md:w-[15%]">
                    {t("doc.line.unit_price_ht", { defaultValue: "P.U. HT" })}
                  </th>
                  <th className="min-w-[90px] py-3 pl-4 text-right font-bold text-slate-800 md:w-[15%]">
                    {t("doc.line.total_ht", { defaultValue: "Total HT" })}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {localizedDoc.lines.map((line, idx) => (
                  <tr key={idx} className={line.unitPrice === 0 ? "break-inside-avoid bg-slate-50" : "break-inside-avoid"}>
                    <td
                      className={`py-3 pr-4 align-top ${
                        line.unitPrice === 0
                          ? "pt-6 text-[10px] font-bold uppercase tracking-wide text-slate-900 md:text-xs"
                          : "text-slate-700"
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
                      {line.unitPrice !== 0
                        ? `${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)} €`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-12 flex justify-end break-inside-avoid md:mb-16">
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-5 md:w-[300px] md:p-6">
              <div className="mb-3 flex justify-between text-sm text-slate-600">
                <span>{t("doc.total_ht", { defaultValue: "Total HT" })}</span>
                <span className="font-bold">{localizedDoc.totalHT.toFixed(2)} €</span>
              </div>
              <div className="mb-4 flex justify-between border-b border-slate-200 pb-4 text-sm text-slate-600">
                <span>
                  {t("doc.vat", { defaultValue: "TVA" })} ({vatPct.toFixed(1)}%)
                </span>
                <span>{localizedDoc.totalVAT.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-800">
                  {t("doc.net_to_pay", { defaultValue: "NET À PAYER" })}
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {localizedDoc.totalTTC.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          <div className="break-inside-avoid border-t border-slate-200 pt-8 text-xs text-slate-500">
            {localizedDoc.notes ? (
              <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 font-bold text-slate-700">
                  {t("doc.notes", { defaultValue: "Notes / Conditions :" })}
                </p>
                <p className="whitespace-pre-line leading-relaxed">{localizedDoc.notes}</p>
              </div>
            ) : null}

            {company.terms ? (
              <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 font-bold text-slate-700">
                  {t("doc.terms_conditions", { defaultValue: "Conditions générales" })}
                </p>
                <p className="whitespace-pre-line leading-relaxed">{company.terms}</p>
              </div>
            ) : null}

            <div className="space-y-1 pb-4 text-center">
              <p className="font-bold text-slate-700">{company.name}</p>
              <p className="text-[10px] uppercase tracking-wide">
                {company.footerNote || `SIRET ${company.siret} - ${company.address} ${company.city}`}
              </p>
              <p className="pt-2 text-[10px] text-slate-300">
                {t("doc.generated_by", { defaultValue: "Document généré par BatiQuant" })}
              </p>
            </div>
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
    </div>
  );
};
