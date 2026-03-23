import { CompanyProfile, QuoteDocument, InvoiceDocument } from '../types';

const KEYS = {
  PROFILE: 'baticalc_company_profile',
  QUOTES: 'baticalc_quotes',
  INVOICES: 'baticalc_invoices',
  COUNTERS: 'baticalc_doc_counters'
};

const DOCS_EVENT = 'batiquant:documents_changed';

type DocumentsEventDetail = {
  key: 'profile' | 'quotes' | 'invoices' | 'counters';
  reason: 'save' | 'delete' | 'numbering';
};

interface Counters {
  quote: number;
  invoice: number;
  year: number;
}

const emitDocumentsChanged = (detail: DocumentsEventDetail) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(DOCS_EVENT, { detail }));
  } catch {
    // ignore
  }
};

export const onDocumentsChanged = (handler: (detail: DocumentsEventDetail) => void) => {
  if (typeof window === 'undefined') return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<DocumentsEventDetail>).detail);
  window.addEventListener(DOCS_EVENT, fn);
  return () => window.removeEventListener(DOCS_EVENT, fn);
};

// --- COMPANY PROFILE ---

export const getCompanyProfile = (): CompanyProfile | null => {
  try {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const saveCompanyProfile = (profile: CompanyProfile) => {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  emitDocumentsChanged({ key: 'profile', reason: 'save' });
};

// --- COUNTERS & NUMBERING ---

const getCounters = (): Counters => {
  const currentYear = new Date().getFullYear();
  try {
    const data = localStorage.getItem(KEYS.COUNTERS);
    const counters = data ? JSON.parse(data) : { quote: 0, invoice: 0, year: currentYear };
    // Reset if year changed
    if (counters.year !== currentYear) {
      return { quote: 0, invoice: 0, year: currentYear };
    }
    return counters;
  } catch {
    return { quote: 0, invoice: 0, year: currentYear };
  }
};

export const generateDocumentNumber = (type: 'quote' | 'invoice'): string => {
  const counters = getCounters();
  const year = counters.year;
  
  if (type === 'quote') {
    counters.quote++;
    localStorage.setItem(KEYS.COUNTERS, JSON.stringify(counters));
    emitDocumentsChanged({ key: 'counters', reason: 'numbering' });
    return `DEV-${year}-${String(counters.quote).padStart(3, '0')}`;
  } else {
    counters.invoice++;
    localStorage.setItem(KEYS.COUNTERS, JSON.stringify(counters));
    emitDocumentsChanged({ key: 'counters', reason: 'numbering' });
    return `FAC-${year}-${String(counters.invoice).padStart(3, '0')}`;
  }
};

// --- QUOTES ---

export const getQuotes = (): QuoteDocument[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getQuote = (id: string): QuoteDocument | undefined => {
  return getQuotes().find(q => q.id === id);
};

export const saveQuote = (quote: QuoteDocument) => {
  const quotes = getQuotes();
  const idx = quotes.findIndex(q => q.id === quote.id);
  if (idx >= 0) quotes[idx] = quote;
  else quotes.push(quote);
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));
  emitDocumentsChanged({ key: 'quotes', reason: 'save' });
};

export const deleteQuote = (id: string) => {
  const quotes = getQuotes().filter(q => q.id !== id);
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));
  emitDocumentsChanged({ key: 'quotes', reason: 'delete' });
};

// --- INVOICES ---

export const getInvoices = (): InvoiceDocument[] => {
  try {
    const data = localStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getInvoice = (id: string): InvoiceDocument | undefined => {
  return getInvoices().find(i => i.id === id);
};

export const saveInvoice = (invoice: InvoiceDocument) => {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === invoice.id);
  if (idx >= 0) invoices[idx] = invoice;
  else invoices.push(invoice);
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  emitDocumentsChanged({ key: 'invoices', reason: 'save' });
};

export const deleteInvoice = (id: string) => {
  const invoices = getInvoices().filter(i => i.id !== id);
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  emitDocumentsChanged({ key: 'invoices', reason: 'delete' });
};
