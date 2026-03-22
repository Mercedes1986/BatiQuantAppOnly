import { HouseProject, QuoteManualLine, Unit } from "../types";
import { getConstructionSteps, localizeLegacyText, type ConstructionStepDef, type ConstructionStepGroup } from "../constants";

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
  type: "material" | "labor" | "service";
}

export interface ComputedQuote {
  sections: QuoteSection[];
  totalMaterialsHT: number;
  totalLaborHT: number;
  subTotalHT: number;
  marginAmount: number;
  totalHT: number;
  discountAmount: number;
  finalHT: number;
  taxAmount: number;
  totalTTC: number;
}

type QuoteSettings = {
  taxRate: number;
  marginPercent: number;
  discountAmount: number;
  showLabor: boolean;
};

const DEFAULT_SETTINGS: QuoteSettings = { taxRate: 20, marginPercent: 0, discountAmount: 0, showLabor: true };

export const calculateQuote = (project: HouseProject): ComputedQuote => {
  const settings: QuoteSettings = { ...DEFAULT_SETTINGS, ...(project.quote?.settings || {}) };
  const manualLines: QuoteManualLine[] = project.quote?.manualLines || [];

  let totalMaterialsHT = 0;
  let totalLaborHT = 0;
  const sections: QuoteSection[] = [];

  const constructionSteps = getConstructionSteps();

  constructionSteps.forEach((group: ConstructionStepGroup) => {
    group.steps.forEach((step: ConstructionStepDef) => {
      const stepId = step.id;
      const stepData = project.steps[stepId];
      const stepManualLines = manualLines.filter((l) => l.stepId === stepId);

      if (!stepData && stepManualLines.length === 0) return;

      const items: QuoteItem[] = [];
      let sectionTotal = 0;

      if (stepData && Array.isArray((stepData as any).materials)) {
        (stepData as any).materials.forEach((mat: any) => {
          const qty = Number(mat.quantity) || 0;
          const up = Number(mat.unitPrice) || 0;
          const total = qty * up;

          items.push({
            id: mat.id,
            label: localizeLegacyText(String(mat.name || "")),
            quantity: qty,
            unit: mat.unit,
            unitPrice: up,
            totalPrice: total,
            type: "material",
            isManual: false,
          });

          totalMaterialsHT += total;
          sectionTotal += total;
        });
      }

      stepManualLines.forEach((line) => {
        const qty = Number(line.quantity) || 0;
        const up = Number(line.unitPrice) || 0;
        const total = qty * up;

        items.push({
          id: line.id,
          label: localizeLegacyText(String(line.label || "")),
          quantity: qty,
          unit: line.unit,
          unitPrice: up,
          totalPrice: total,
          type: line.category,
          isManual: true,
        });

        if (line.category === "labor") totalLaborHT += total;
        else totalMaterialsHT += total;

        sectionTotal += total;
      });

      if (items.length > 0) {
        sections.push({
          id: stepId,
          label: step.label,
          items,
          totalHT: sectionTotal,
        });
      }
    });
  });

  const globalLines = manualLines.filter((l) => l.stepId === "global");
  if (globalLines.length > 0) {
    const items: QuoteItem[] = [];
    let sectionTotal = 0;

    globalLines.forEach((line) => {
      const qty = Number(line.quantity) || 0;
      const up = Number(line.unitPrice) || 0;
      const total = qty * up;

      items.push({
        id: line.id,
        label: localizeLegacyText(String(line.label || "")),
        quantity: qty,
        unit: line.unit,
        unitPrice: up,
        totalPrice: total,
        type: line.category,
        isManual: true,
      });

      if (line.category === "labor") totalLaborHT += total;
      else totalMaterialsHT += total;

      sectionTotal += total;
    });

    sections.push({
      id: "global",
      label: localizeLegacyText("Frais Généraux / Divers"),
      items,
      totalHT: sectionTotal,
    });
  }

  const subTotalHT = totalMaterialsHT + totalLaborHT;

  const marginAmount = subTotalHT * ((Number(settings.marginPercent) || 0) / 100);
  const totalHT = subTotalHT + marginAmount;

  const discountAmount = Number(settings.discountAmount) || 0;
  const finalHT = Math.max(0, totalHT - discountAmount);

  const taxAmount = finalHT * ((Number(settings.taxRate) || 0) / 100);
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
    totalTTC,
  };
};

export const generateQuoteCSV = (
  quote: ComputedQuote,
  projectName: string,
  t?: (k: string, opt?: any) => string
): string => {
  const tr = (key: string, def: string) => (t ? t(key, { defaultValue: def }) : def);

  const headers = [
    tr("csv.section", "Poste"),
    tr("csv.label", "Désignation"),
    tr("csv.type", "Type"),
    tr("csv.qty", "Quantité"),
    tr("csv.unit", "Unité"),
    tr("csv.unit_price_ht", "Prix U. HT"),
    tr("csv.total_ht", "Total HT"),
  ];

  const rows: string[] = [];
  const f = (n: number) => String((Number(n) || 0).toFixed(2)).replace(".", ",");

  quote.sections.forEach((sec) => {
    sec.items.forEach((item) => {
      rows.push(
        [
          sec.label,
          item.label,
          item.type === "labor" ? tr("csv.labor", "Main d'œuvre") : tr("csv.material", "Matériel"),
          String(item.quantity).replace(".", ","),
          String(item.unit),
          f(item.unitPrice),
          f(item.totalPrice),
        ].join(";")
      );
    });
  });

  rows.push(["", "", "", "", "", "", ""].join(";"));
  rows.push([tr("csv.total_materials", "TOTAL MATERIEL"), "", "", "", "", "", f(quote.totalMaterialsHT)].join(";"));
  rows.push([tr("csv.total_labor", "TOTAL MO"), "", "", "", "", "", f(quote.totalLaborHT)].join(";"));

  const marginPct = quote.subTotalHT > 0 ? (quote.marginAmount / quote.subTotalHT) * 100 : 0;
  rows.push([tr("csv.margin", "MARGE"), `${marginPct.toFixed(1).replace(".", ",")}%`, "", "", "", "", f(quote.marginAmount)].join(";"));

  rows.push([tr("csv.total_ht", "TOTAL HT"), "", "", "", "", "", f(quote.totalHT)].join(";"));

  const taxPct = quote.finalHT > 0 ? (quote.taxAmount / quote.finalHT) * 100 : 0;
  rows.push([tr("csv.vat", "TVA"), `${taxPct.toFixed(1).replace(".", ",")}%`, "", "", "", "", f(quote.taxAmount)].join(";"));

  rows.push([tr("csv.total_ttc", "TOTAL TTC"), "", "", "", "", "", f(quote.totalTTC)].join(";"));

  return headers.join(";") + "\n" + rows.join("\n");
};