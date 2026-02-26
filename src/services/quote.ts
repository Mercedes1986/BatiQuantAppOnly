
import { HouseProject, ConstructionStepId, QuoteManualLine, Unit } from '../types';
import { CONSTRUCTION_STEPS } from '../constants';

export interface QuoteSection {
  id: string;
  label: string;
  items: QuoteItem[];
  totalHT: number;
}

export interface QuoteItem {
  id: string;
  label: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  totalPrice: number;
  isManual?: boolean;
  type: 'material' | 'labor' | 'service';
}

export interface ComputedQuote {
  sections: QuoteSection[];
  totalMaterialsHT: number;
  totalLaborHT: number;
  subTotalHT: number; // Before margin
  marginAmount: number;
  totalHT: number; // After margin
  discountAmount: number;
  finalHT: number; // After discount
  taxAmount: number;
  totalTTC: number;
}

export const calculateQuote = (project: HouseProject): ComputedQuote => {
  const settings = project.quote?.settings || { taxRate: 20, marginPercent: 0, discountAmount: 0, showLabor: true };
  const manualLines = project.quote?.manualLines || [];

  let totalMaterialsHT = 0;
  let totalLaborHT = 0;
  const sections: QuoteSection[] = [];

  // 1. Iterate through defined construction steps to preserve order
  CONSTRUCTION_STEPS.forEach(group => {
    group.steps.forEach(step => {
      const stepId = step.id;
      const stepData = project.steps[stepId];
      const stepManualLines = manualLines.filter(l => l.stepId === stepId);

      // Skip if no data and no manual lines
      if (!stepData && stepManualLines.length === 0) return;

      const items: QuoteItem[] = [];
      let sectionTotal = 0;

      // A. Automated Materials from Calculator
      if (stepData && stepData.materials) {
        stepData.materials.forEach(mat => {
          const total = mat.quantity * mat.unitPrice;
          items.push({
            id: mat.id,
            label: mat.name,
            quantity: mat.quantity,
            unit: mat.unit,
            unitPrice: mat.unitPrice,
            totalPrice: total,
            type: 'material',
            isManual: false
          });
          totalMaterialsHT += total;
          sectionTotal += total;
        });
      }

      // B. Manual Lines (Labor/Extras) for this step
      stepManualLines.forEach(line => {
        const total = line.quantity * line.unitPrice;
        items.push({
          id: line.id,
          label: line.label,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          totalPrice: total,
          type: line.category,
          isManual: true
        });
        if (line.category === 'labor') totalLaborHT += total;
        else totalMaterialsHT += total; // Service counts as mat/other for base
        sectionTotal += total;
      });

      if (items.length > 0) {
        sections.push({
          id: stepId,
          label: step.label,
          items,
          totalHT: sectionTotal
        });
      }
    });
  });

  // 2. Global Manual Lines (General items)
  const globalLines = manualLines.filter(l => l.stepId === 'global');
  if (globalLines.length > 0) {
    const items: QuoteItem[] = [];
    let sectionTotal = 0;
    
    globalLines.forEach(line => {
      const total = line.quantity * line.unitPrice;
      items.push({
        id: line.id,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalPrice: total,
        type: line.category,
        isManual: true
      });
      if (line.category === 'labor') totalLaborHT += total;
      else totalMaterialsHT += total;
      sectionTotal += total;
    });

    sections.push({
      id: 'global',
      label: 'Frais Généraux / Divers',
      items,
      totalHT: sectionTotal
    });
  }

  // 3. Totals Calculation
  const subTotalHT = totalMaterialsHT + totalLaborHT;
  
  // Margin (applied on subtotal)
  const marginAmount = subTotalHT * (settings.marginPercent / 100);
  const totalHT = subTotalHT + marginAmount;

  // Discount (applied on totalHT)
  const discountAmount = settings.discountAmount;
  const finalHT = Math.max(0, totalHT - discountAmount);

  // Tax
  const taxAmount = finalHT * (settings.taxRate / 100);
  const totalTTC = finalHT + taxAmount;

  return {
    sections,
    totalMaterialsHT,
    totalLaborHT,
    subTotalHT,
    marginAmount,
    totalHT,
    discountAmount,
    finalHT,
    taxAmount,
    totalTTC
  };
};

export const generateQuoteCSV = (quote: ComputedQuote, projectName: string): string => {
  const headers = ['Poste', 'Désignation', 'Type', 'Quantité', 'Unité', 'Prix U. HT', 'Total HT'];
  const rows = [];

  quote.sections.forEach(sec => {
    sec.items.forEach(item => {
      rows.push([
        sec.label,
        item.label,
        item.type === 'labor' ? 'Main d\'œuvre' : 'Matériel',
        item.quantity.toString().replace('.', ','),
        item.unit,
        item.unitPrice.toFixed(2).replace('.', ','),
        item.totalPrice.toFixed(2).replace('.', ',')
      ].join(';'));
    });
  });

  // Footer rows
  rows.push(['', '', '', '', '', '', '']);
  rows.push(['TOTAL MATERIEL', '', '', '', '', '', quote.totalMaterialsHT.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['TOTAL MO', '', '', '', '', '', quote.totalLaborHT.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['MARGE', `${(quote.marginAmount / quote.subTotalHT * 100).toFixed(1)}%`, '', '', '', '', quote.marginAmount.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['TOTAL HT', '', '', '', '', '', quote.totalHT.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['TVA', `${(quote.taxAmount / quote.finalHT * 100).toFixed(1)}%`, '', '', '', '', quote.taxAmount.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['TOTAL TTC', '', '', '', '', '', quote.totalTTC.toFixed(2).replace('.', ',')].join(';'));

  return headers.join(';') + '\n' + rows.join('\n');
};
