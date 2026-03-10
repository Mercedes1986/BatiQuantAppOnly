export type AdPlatform = "none" | "web" | "mobile";
export type AdPlacementVariant = "content" | "safe";
export type AdPermission = "deny" | "placeholder";

const env = (import.meta as any)?.env ?? {};

const startsWithAny = (pathname: string, routes: readonly string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(route + "/"));

const truthy = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

export const AD_CONFIG = {
  PLATFORM: (env.VITE_AD_PLATFORM as AdPlatform | undefined) || "mobile",
  ENABLE_ADS: truthy(env.VITE_ADS_ENABLED ?? "true"),
  ENABLE_WEB_PLACEHOLDERS: truthy(env.VITE_ENABLE_WEB_AD_PLACEHOLDERS ?? "true"),
  ENABLE_DEBUG_LABELS: truthy(env.DEV) || truthy(env.VITE_ENABLE_AD_DEBUG),
  PRIVACY_POLICY_URL: String(env.VITE_PRIVACY_POLICY_URL || "").trim(),
  MOBILE_APP_ID_ANDROID: String(env.VITE_ADMOB_APP_ID_ANDROID || "").trim(),
  MOBILE_APP_ID_IOS: String(env.VITE_ADMOB_APP_ID_IOS || "").trim(),
  BANNER_HOME: String(env.VITE_ADMOB_BANNER_HOME || "APP_DASHBOARD_SLOT").trim(),
  BANNER_RESULT: String(env.VITE_ADMOB_BANNER_RESULT || "APP_RESULT_SLOT").trim(),
  INTERSTITIAL_CALC_DONE: String(env.VITE_ADMOB_INTERSTITIAL_CALC_DONE || "").trim(),
  DENY_LIST: ["/app/settings", "/app/quotes", "/app/invoices", "/app/print"],
  SAFE_ROUTES: [
    "/app",
    "/app/dashboard",
    "/app/calculator",
    "/app/house",
    "/app/projects",
    "/app/materials",
    "/app/menu",
    "/app/quick-tools",
  ],
} as const;

export const getAdPermission = (
  pathname: string,
  variant: AdPlacementVariant = "content"
): AdPermission => {
  if (!AD_CONFIG.ENABLE_ADS) return "deny";
  if (startsWithAny(pathname, AD_CONFIG.DENY_LIST)) return "deny";
  if (!startsWithAny(pathname, AD_CONFIG.SAFE_ROUTES)) return "deny";

  if (variant === "content") return "deny";
  return AD_CONFIG.ENABLE_WEB_PLACEHOLDERS ? "placeholder" : "deny";
};

export const hasAnyMobileAdUnit = (): boolean =>
  Boolean(
    AD_CONFIG.MOBILE_APP_ID_ANDROID ||
      AD_CONFIG.MOBILE_APP_ID_IOS ||
      AD_CONFIG.BANNER_HOME ||
      AD_CONFIG.BANNER_RESULT ||
      AD_CONFIG.INTERSTITIAL_CALC_DONE
  );
