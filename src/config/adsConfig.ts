// src/config/adsConfig.ts
const ADSENSE_CLIENT = (import.meta as any)?.env?.VITE_ADSENSE_CLIENT as string | undefined;

export const AD_CONFIG = {
  // Doit matcher la config runtime si tu injectes aussi ADSENSE_CLIENT dans /env.js
  PUBLISHER_ID: ADSENSE_CLIENT || "",

  DENY_LIST: ["/app/settings", "/app/quotes", "/app/invoices", "/app/print"],

  APP_SAFE_ROUTES: [
    "/app",
    "/app/dashboard",
    "/app/calculator",
    "/app/house",
    "/app/projects",
    "/app/materials",
  ],
} as const;

const startsWithAny = (pathname: string, routes: readonly string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(route + "/"));

export const getAdPermission = (
  pathname: string
): "deny" | "content" | "safe_only" => {
  // Pas de client => pas de pubs
  if (!AD_CONFIG.PUBLISHER_ID) return "deny";

  if (startsWithAny(pathname, AD_CONFIG.DENY_LIST)) return "deny";

  // Tu peux évoluer plus tard :
  // - "content" pour routes autorisées en contenu
  // - "safe_only" pour placements limités
  return "safe_only";
};