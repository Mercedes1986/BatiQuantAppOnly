import { CompanyProfile, QuoteDocument, InvoiceDocument } from "../types";
import {
  canUsePersistentStorage,
  markNamespaceMigrated,
  migrateLegacyKey,
  readJson,
  writeJson,
} from "./persistentStorage";

const KEYS = {
  PROFILE: "batiquant_company_profile",
  QUOTES: "batiquant_quotes",
  INVOICES: "batiquant_invoices",
  COUNTERS: "batiquant_doc_counters",
};

const LEGACY_KEYS = {
  PROFILE: "baticalc_company_profile",
  QUOTES: "baticalc_quotes",
  INVOICES: "baticalc_invoices",
  COUNTERS: "baticalc_doc_counters",
};

const DOCS_EVENT = "batiquant:documents_changed";
const STORAGE_NAMESPACE = "documents";

type DocumentsEventDetail = {
  key: "profile" | "quotes" | "invoices" | "counters";
  reason: "save" | "delete" | "numbering" | "import";
};

interface Counters {
  quote: number;
  invoice: number;
  year: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const DEFAULT_COUNTERS = (year = new Date().getFullYear()): Counters => ({
  quote: 0,
  invoice: 0,
  year,
});

const sanitizeCounters = (value: unknown): Counters => {
  const currentYear = new Date().getFullYear();
  if (!isRecord(value)) return DEFAULT_COUNTERS(currentYear);

  const year = typeof value.year === "number" && Number.isFinite(value.year) ? value.year : currentYear;
  if (year !== currentYear) return DEFAULT_COUNTERS(currentYear);

  return {
    quote: typeof value.quote === "number" && Number.isFinite(value.quote) ? Math.max(0, value.quote) : 0,
    invoice: typeof value.invoice === "number" && Number.isFinite(value.invoice) ? Math.max(0, value.invoice) : 0,
    year,
  };
};

const sanitizeCompanyProfile = (value: unknown): CompanyProfile | null => {
  if (!isRecord(value)) return null;
  if (typeof value.name !== "string") return null;

  return {
    name: typeof value.name === "string" ? value.name : "",
    address: typeof value.address === "string" ? value.address : "",
    city: typeof value.city === "string" ? value.city : "",
    zip: typeof value.zip === "string" ? value.zip : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    email: typeof value.email === "string" ? value.email : "",
    siret: typeof value.siret === "string" ? value.siret : "",
    tvaNumber: typeof value.tvaNumber === "string" ? value.tvaNumber : undefined,
    logoUrl: typeof value.logoUrl === "string" ? value.logoUrl : undefined,
    footerNote: typeof value.footerNote === "string" ? value.footerNote : undefined,
    terms: typeof value.terms === "string" ? value.terms : undefined,
  };
};

const sanitizeQuotes = (value: unknown): QuoteDocument[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is QuoteDocument =>
      isRecord(item) && typeof item.id === "string" && typeof item.number === "string" && item.type === "quote"
  );
};

const sanitizeInvoices = (value: unknown): InvoiceDocument[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is InvoiceDocument =>
      isRecord(item) && typeof item.id === "string" && typeof item.number === "string" && item.type === "invoice"
  );
};

const extractSequenceFromNumber = (value: unknown, prefix: "DEV" | "FAC", year: number): number => {
  if (typeof value !== "string") return 0;
  const match = value.match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const normalizeCountersForData = (
  counters: Counters,
  quotes: QuoteDocument[],
  invoices: InvoiceDocument[],
): Counters => {
  const year = counters.year || new Date().getFullYear();
  const inferredQuote = quotes.reduce((max, quote) => Math.max(max, extractSequenceFromNumber(quote.number, "DEV", year)), 0);
  const inferredInvoice = invoices.reduce((max, invoice) => Math.max(max, extractSequenceFromNumber(invoice.number, "FAC", year)), 0);

  return {
    year,
    quote: Math.max(counters.quote, inferredQuote),
    invoice: Math.max(counters.invoice, inferredInvoice),
  };
};

const emitDocumentsChanged = (detail: DocumentsEventDetail) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(DOCS_EVENT, { detail }));
  } catch {
    // ignore
  }
};

export const onDocumentsChanged = (handler: (detail: DocumentsEventDetail) => void) => {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<DocumentsEventDetail>).detail);
  window.addEventListener(DOCS_EVENT, fn);
  return () => window.removeEventListener(DOCS_EVENT, fn);
};

let didMigrate = false;
const ensureMigratedOnce = () => {
  if (didMigrate) return;
  didMigrate = true;

  if (!canUsePersistentStorage()) return;

  migrateLegacyKey(KEYS.PROFILE, [LEGACY_KEYS.PROFILE]);
  migrateLegacyKey(KEYS.QUOTES, [LEGACY_KEYS.QUOTES]);
  migrateLegacyKey(KEYS.INVOICES, [LEGACY_KEYS.INVOICES]);
  migrateLegacyKey(KEYS.COUNTERS, [LEGACY_KEYS.COUNTERS]);
  markNamespaceMigrated(STORAGE_NAMESPACE);
};

const readCounters = (): Counters => sanitizeCounters(readJson<unknown>(KEYS.COUNTERS, DEFAULT_COUNTERS()));

export const getCompanyProfile = (): CompanyProfile | null => {
  ensureMigratedOnce();
  return sanitizeCompanyProfile(readJson<unknown>(KEYS.PROFILE, null));
};

export const saveCompanyProfile = (profile: CompanyProfile) => {
  ensureMigratedOnce();
  writeJson(KEYS.PROFILE, sanitizeCompanyProfile(profile));
  emitDocumentsChanged({ key: "profile", reason: "save" });
};

export const replaceCompanyProfile = (profile: CompanyProfile | null) => {
  ensureMigratedOnce();
  writeJson(KEYS.PROFILE, sanitizeCompanyProfile(profile));
  emitDocumentsChanged({ key: "profile", reason: "import" });
};

const getCounters = (): Counters => {
  ensureMigratedOnce();
  return readCounters();
};

export const getDocumentCounters = (): Counters => getCounters();

export const replaceDocumentCounters = (counters: Counters) => {
  ensureMigratedOnce();
  const safeCounters = sanitizeCounters(counters);
  const normalized = normalizeCountersForData(safeCounters, getQuotes(), getInvoices());
  writeJson(KEYS.COUNTERS, normalized);
  emitDocumentsChanged({ key: "counters", reason: "import" });
};

export const generateDocumentNumber = (type: "quote" | "invoice"): string => {
  ensureMigratedOnce();
  const counters = getCounters();
  const year = counters.year;

  if (type === "quote") {
    counters.quote += 1;
    writeJson(KEYS.COUNTERS, counters);
    emitDocumentsChanged({ key: "counters", reason: "numbering" });
    return `DEV-${year}-${String(counters.quote).padStart(3, "0")}`;
  }

  counters.invoice += 1;
  writeJson(KEYS.COUNTERS, counters);
  emitDocumentsChanged({ key: "counters", reason: "numbering" });
  return `FAC-${year}-${String(counters.invoice).padStart(3, "0")}`;
};

export const getQuotes = (): QuoteDocument[] => {
  ensureMigratedOnce();
  return sanitizeQuotes(readJson<unknown>(KEYS.QUOTES, []));
};

export const replaceQuotes = (quotes: QuoteDocument[]) => {
  ensureMigratedOnce();
  writeJson(KEYS.QUOTES, sanitizeQuotes(quotes));
  emitDocumentsChanged({ key: "quotes", reason: "import" });
};

export const getQuote = (id: string): QuoteDocument | undefined => {
  return getQuotes().find((quote) => quote.id === id);
};

export const saveQuote = (quote: QuoteDocument) => {
  ensureMigratedOnce();
  const quotes = getQuotes();
  const idx = quotes.findIndex((item) => item.id === quote.id);
  if (idx >= 0) quotes[idx] = quote;
  else quotes.push(quote);
  writeJson(KEYS.QUOTES, quotes);
  emitDocumentsChanged({ key: "quotes", reason: "save" });
};

export const deleteQuote = (id: string) => {
  ensureMigratedOnce();
  const quotes = getQuotes().filter((quote) => quote.id !== id);
  writeJson(KEYS.QUOTES, quotes);
  emitDocumentsChanged({ key: "quotes", reason: "delete" });
};

export const getInvoices = (): InvoiceDocument[] => {
  ensureMigratedOnce();
  return sanitizeInvoices(readJson<unknown>(KEYS.INVOICES, []));
};

export const replaceInvoices = (invoices: InvoiceDocument[]) => {
  ensureMigratedOnce();
  writeJson(KEYS.INVOICES, sanitizeInvoices(invoices));
  emitDocumentsChanged({ key: "invoices", reason: "import" });
};

export const getInvoice = (id: string): InvoiceDocument | undefined => {
  return getInvoices().find((invoice) => invoice.id === id);
};

export const saveInvoice = (invoice: InvoiceDocument) => {
  ensureMigratedOnce();
  const invoices = getInvoices();
  const idx = invoices.findIndex((item) => item.id === invoice.id);
  if (idx >= 0) invoices[idx] = invoice;
  else invoices.push(invoice);
  writeJson(KEYS.INVOICES, invoices);
  emitDocumentsChanged({ key: "invoices", reason: "save" });
};

export const deleteInvoice = (id: string) => {
  ensureMigratedOnce();
  const invoices = getInvoices().filter((invoice) => invoice.id !== id);
  writeJson(KEYS.INVOICES, invoices);
  emitDocumentsChanged({ key: "invoices", reason: "delete" });
};
