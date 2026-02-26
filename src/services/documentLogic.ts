
import { 
  HouseProject, Project, QuoteDocument, InvoiceDocument, 
  ClientInfo, DocumentLine, CompanyProfile 
} from '../types';
import { ComputedQuote } from './quote';
import { generateId } from './storage';
import { generateDocumentNumber, saveQuote, saveInvoice, getQuote } from './documentsStorage';

// --- LOGIC FOR HOUSE PROJECTS (CHANTIER) ---

export const createQuoteFromProject = (
  project: HouseProject,
  computed: ComputedQuote,
  company: CompanyProfile,
  client: ClientInfo
): string => {
  const docId = generateId();
  const docNumber = generateDocumentNumber('quote');
  
  // Transform sections/items into flat lines
  const lines: DocumentLine[] = [];
  
  computed.sections.forEach(section => {
    // Header Line for Section
    lines.push({
      id: generateId(),
      description: `--- ${section.label.toUpperCase()} ---`,
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalHT: 0,
      vatRate: 0
    });

    section.items.forEach(item => {
      lines.push({
        id: generateId(),
        description: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalHT: item.totalPrice,
        vatRate: project.quote?.settings?.taxRate || 20
      });
    });
  });

  const quote: QuoteDocument = {
    id: docId,
    type: 'quote',
    status: 'draft',
    projectId: project.id,
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
    client,
    lines,
    totalHT: computed.finalHT,
    totalVAT: computed.taxAmount,
    totalTTC: computed.totalTTC,
    notes: `Devis généré depuis le chantier "${project.name}"`
  };

  saveQuote(quote);
  return docId;
};

// --- LOGIC FOR SIMPLE PROJECTS (CALCULATOR LISTS) ---

export const createQuoteFromSimpleProject = (
  project: Project,
  company: CompanyProfile,
  client: ClientInfo
): string => {
  const docId = generateId();
  const docNumber = generateDocumentNumber('quote');
  
  const lines: DocumentLine[] = [];
  let totalHT = 0;
  
  project.items.forEach(item => {
    const lineTotal = item.quantity * item.unitPrice;
    totalHT += lineTotal;
    
    lines.push({
      id: generateId(),
      description: item.name + (item.details ? ` (${item.details})` : ''),
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalHT: lineTotal,
      vatRate: 20 // Default 20% for simple projects
    });
  });

  const totalVAT = totalHT * 0.20;

  const quote: QuoteDocument = {
    id: docId,
    type: 'quote',
    status: 'draft',
    projectId: project.id, // Links to simple project ID
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client,
    lines,
    totalHT: totalHT,
    totalVAT: totalVAT,
    totalTTC: totalHT + totalVAT,
    notes: `Devis généré depuis la liste "${project.name}"`
  };

  saveQuote(quote);
  return docId;
};

// --- SHARED ---

export const convertQuoteToInvoice = (quoteId: string): string | null => {
  const quote = getQuote(quoteId);
  if (!quote) return null;

  const docId = generateId();
  const docNumber = generateDocumentNumber('invoice');

  const invoice: InvoiceDocument = {
    id: docId,
    type: 'invoice',
    status: 'draft',
    projectId: quote.projectId,
    quoteSourceId: quote.id,
    number: docNumber,
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    client: quote.client,
    lines: quote.lines,
    totalHT: quote.totalHT,
    totalVAT: quote.totalVAT,
    totalTTC: quote.totalTTC,
    notes: `Facture issue du devis ${quote.number}`
  };

  saveInvoice(invoice);
  
  // Update quote status
  quote.status = 'invoiced';
  saveQuote(quote);

  return docId;
};

export const recalculateTotals = (doc: QuoteDocument | InvoiceDocument): QuoteDocument | InvoiceDocument => {
  let totalHT = 0;
  let totalVAT = 0;

  doc.lines.forEach(line => {
    if (line.unitPrice !== 0) { // Ignore headers
      const lineTotal = line.quantity * line.unitPrice;
      line.totalHT = lineTotal;
      totalHT += lineTotal;
      totalVAT += lineTotal * (line.vatRate / 100);
    }
  });

  doc.totalHT = totalHT;
  doc.totalVAT = totalVAT;
  doc.totalTTC = totalHT + totalVAT;
  
  return { ...doc };
};
