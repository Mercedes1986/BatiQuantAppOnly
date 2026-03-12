import i18n from "./index";

export type CurrencyCode = "EUR" | "USD" | "GBP" | string;

export function getLocale(): string {
  const lng = i18n.language || "fr";
  if (lng.startsWith("fr")) return "fr-FR";
  if (lng.startsWith("en")) return "en-US";
  return "fr-FR";
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatInteger(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}

export function formatDecimal(value: number, digits = 2): string {
  return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode = "EUR",
  options?: Intl.NumberFormatOptions
): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options
  }).format(value);
}

/**
 * Format simple d'unités (à compléter selon ton app)
 */
export function formatUnit(value: number, unit: "m" | "m²" | "m³" | "kg" | "l" | "cm"): string {
  // On évite de mettre des unités dans les fichiers de traduction.
  return `${formatNumber(value)} ${unit}`;
}