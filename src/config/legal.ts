export const LEGAL = {
  APP_NAME: "BatiQuant",
  PUBLISHER_NAME: "OddPixel Factory",
  RESPONSIBLE_NAME: "Pierre André Valles",
  SUPPORT_EMAIL: "aide.client.fr@gmail.com",
  SITE_URL: "https://www.batiquant.fr/",
  PUBLIC_PRIVACY_POLICY_URL: "https://www.batiquant.fr/privacy-policy.html",
} as const;

export const getSupportMailToHref = (subject?: string): string => {
  const base = `mailto:${LEGAL.SUPPORT_EMAIL}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
};

export const openExternalUrl = (url: string): void => {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};
