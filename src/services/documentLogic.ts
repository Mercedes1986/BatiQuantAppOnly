import {
  HouseProject,
  Project,
  QuoteDocument,
  InvoiceDocument,
  ClientInfo,
  DocumentLine,
  CompanyProfile,
} from "../types";
import { ComputedQuote } from "./quote";
import { generateId } from "./storage";
import { generateDocumentNumber, saveQuote, saveInvoice, getQuote } from "./documentsStorage";

const todayISO = () => new Date().toISOString().split("T")[0];

export const createQuoteFromProject = (
  project: HouseProject,
  computed: ComputedQuote,
  company: CompanyProfile,
  client: ClientInfo
): string => {
  const docId = generateId();
  const docNumber = generateDocumentNumber("quote");

  const vatRate = project.quote?.settings?.taxRate ?? 20;

  const lines: DocumentLine[] = [];

  computed.sections.forEach((section) => {
    lines.push({
      id: generateId(),
      description: `--- ${String(section.label || "").toUpperCase()} ---`,
      quantity: 1,
      unit: "",
      unitPrice: 0,
      totalHT: 0,
      vatRate: 0,
    });

    section.items.forEach((item) => {
      lines.push({
        id: generateId(),
        description: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalHT: item.totalPrice,
        vatRate,
      });
    });
  });

  const quote: QuoteDocument = {
    id: docId,
    type: "quote",
    status: "draft",
    projectId: project.id,
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: todayISO(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    client,
    lines,
    totalHT: computed.finalHT,
    totalVAT: computed.taxAmount,
    totalTTC: computed.totalTTC,
    notes: `Devis généré depuis le chantier "${project.name}"`,
  };

  saveQuote(quote);
  return docId;
};

export const createQuoteFromSimpleProject = (
  project: Project,
  company: CompanyProfile,
  client: ClientInfo
): string => {
  const docId = generateId();
  const docNumber = generateDocumentNumber("quote");

  const lines: DocumentLine[] = [];
  let totalHT = 0;

  project.items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const up = Number(item.unitPrice) || 0;
    const lineTotal = qty * up;
    totalHT += lineTotal;

    lines.push({
      id: generateId(),
      description: item.name + (item.details ? ` (${item.details})` : ""),
      quantity: qty,
      unit: item.unit,
      unitPrice: up,
      totalHT: lineTotal,
      vatRate: 20,
    });
  });

  const totalVAT = totalHT * 0.2;

  const quote: QuoteDocument = {
    id: docId,
    type: "quote",
    status: "draft",
    projectId: project.id,
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: todayISO(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    client,
    lines,
    totalHT,
    totalVAT,
    totalTTC: totalHT + totalVAT,
    notes: `Devis généré depuis la liste "${project.name}"`,
  };

  saveQuote(quote);
  return docId;
};

export const convertQuoteToInvoice = (quoteId: string): string | null => {
  const quote = getQuote(quoteId);
  if (!quote) return null;

  const docId = generateId();
  const docNumber = generateDocumentNumber("invoice");

  const invoice: InvoiceDocument = {
    id: docId,
    type: "invoice",
    status: "draft",
    projectId: quote.projectId,
    quoteSourceId: quote.id,
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: todayISO(),
    client: { ...quote.client },
    lines: quote.lines.map((l) => ({ ...l })), // copy
    totalHT: quote.totalHT,
    totalVAT: quote.totalVAT,
    totalTTC: quote.totalTTC,
    notes: `Facture issue du devis ${quote.number}`,
  };

  saveInvoice(invoice);

  const updatedQuote: QuoteDocument = { ...quote, status: "invoiced" };
  saveQuote(updatedQuote);

  return docId;
};

export const recalculateTotals = (doc: QuoteDocument | InvoiceDocument) => {
  let totalHT = 0;
  let totalVAT = 0;

  const nextLines = doc.lines.map((line) => {
    if (line.unitPrice === 0) return { ...line };

    const qty = Number(line.quantity) || 0;
    const up = Number(line.unitPrice) || 0;
    const lineTotal = qty * up;

    const vatRate = Number(line.vatRate) || 0;
    totalHT += lineTotal;
    totalVAT += lineTotal * (vatRate / 100);

    return { ...line, totalHT: lineTotal, vatRate };
  });

  return {
    ...doc,
    lines: nextLines,
    totalHT,
    totalVAT,
    totalTTC: totalHT + totalVAT,
  };
};