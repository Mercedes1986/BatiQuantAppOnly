import type { AdPlacement, AdPlatform } from "@/types/ads";

export type AdPermission = "deny" | "placeholder" | "allow";

const env = import.meta.env;

const truthy = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const startsWithAny = (pathname: string, routes: readonly string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(route + "/"));

export const AD_CONFIG = {
  PLATFORM: (env.VITE_AD_PLATFORM || "mobile") as AdPlatform,
  ENABLE_ADS: truthy(env.VITE_ADS_ENABLED ?? "true"),
  ENABLE_INLINE_BANNERS: truthy(env.VITE_ENABLE_INLINE_BANNERS ?? "false"),
  ENABLE_WEB_PLACEHOLDERS: truthy(env.VITE_ENABLE_WEB_AD_PLACEHOLDERS ?? "false"),
  ENABLE_DEBUG_LABELS: truthy(env.DEV) || truthy(env.VITE_ENABLE_AD_DEBUG),
  PRIVACY_POLICY_URL: String(env.VITE_PRIVACY_POLICY_URL || "").trim(),
  MOBILE_APP_ID_ANDROID: String(env.VITE_ADMOB_APP_ID_ANDROID || "").trim(),
  MOBILE_APP_ID_IOS: String(env.VITE_ADMOB_APP_ID_IOS || "").trim(),
  UNITS: {
    dashboard_banner: String(env.VITE_ADMOB_BANNER_HOME || "").trim(),
    projects_banner: String(env.VITE_ADMOB_BANNER_PROJECTS || env.VITE_ADMOB_BANNER_HOME || "").trim(),
    house_banner: String(env.VITE_ADMOB_BANNER_HOUSE || env.VITE_ADMOB_BANNER_HOME || "").trim(),
    materials_banner: String(env.VITE_ADMOB_BANNER_MATERIALS || env.VITE_ADMOB_BANNER_HOME || "").trim(),
    quicktools_banner: String(env.VITE_ADMOB_BANNER_QUICKTOOLS || env.VITE_ADMOB_BANNER_HOME || "").trim(),
    calculator_result_banner: String(env.VITE_ADMOB_BANNER_RESULT || env.VITE_ADMOB_BANNER_HOME || "").trim(),
    calculator_interstitial: String(env.VITE_ADMOB_INTERSTITIAL_CALC_DONE || "").trim(),
  } as Record<AdPlacement, string>,
  INTERSTITIAL_COOLDOWN_MS: Number(env.VITE_ADMOB_INTERSTITIAL_COOLDOWN_MS || 180000),
  INTERSTITIAL_EVERY_N_RESULTS: Math.max(3, Number(env.VITE_ADMOB_INTERSTITIAL_EVERY_N_RESULTS || 3)),
  INTERSTITIAL_REPEAT_RESULT_WINDOW_MS: Math.max(
    10000,
    Number(env.VITE_ADMOB_INTERSTITIAL_REPEAT_RESULT_WINDOW_MS || 30000),
  ),
  INTERSTITIAL_WAIT_TIMEOUT_MS: Math.max(
    4000,
    Number(env.VITE_ADMOB_INTERSTITIAL_WAIT_TIMEOUT_MS || 8000),
  ),
  DENY_LIST: ["/app/settings", "/app/quotes", "/app/invoices", "/app/print"],
  SAFE_ROUTES: [
    "/app",
    "/app/dashboard",
    "/app/calculators",
    "/app/calculator",
    "/app/house",
    "/app/projects",
    "/app/materials",
    "/app/menu",
    "/app/quick-tools",
  ],
} as const;

export const getAdUnitId = (placement: AdPlacement): string => AD_CONFIG.UNITS[placement];

export const hasMobileAppId = (): boolean =>
  Boolean(AD_CONFIG.MOBILE_APP_ID_ANDROID || AD_CONFIG.MOBILE_APP_ID_IOS);

export const hasAnyMobileAdUnit = (): boolean =>
  Object.values(AD_CONFIG.UNITS).some((value) => Boolean(String(value || "").trim()));

export const canUseAdsOnPath = (pathname: string): boolean => {
  if (startsWithAny(pathname, AD_CONFIG.DENY_LIST)) return false;
  return startsWithAny(pathname, AD_CONFIG.SAFE_ROUTES);
};

export const getAdPermission = (pathname: string): AdPermission => {
  if (!AD_CONFIG.ENABLE_ADS) return "deny";
  if (!canUseAdsOnPath(pathname)) return "deny";

  if (AD_CONFIG.PLATFORM === "mobile" && hasMobileAppId()) {
    return "allow";
  }

  return AD_CONFIG.ENABLE_WEB_PLACEHOLDERS ? "placeholder" : "deny";
};
