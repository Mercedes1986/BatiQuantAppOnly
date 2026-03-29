import { getSettings, saveSettings } from "@/services/storage";

const truthy = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const AD_FREE_EVENT = "batiquant:adfree_updated";

export const isPaidAppBuild = (): boolean => truthy(import.meta.env.VITE_PAID_APP ?? "false");

export const hasAdFreeEntitlement = (): boolean => {
  if (isPaidAppBuild()) return true;
  const disableAdsForPro = truthy(import.meta.env.VITE_DISABLE_ADS_FOR_PRO ?? "true");
  if (!disableAdsForPro) return false;
  try {
    return Boolean(getSettings().isPro);
  } catch {
    return false;
  }
};

export const setAdFreeEntitlement = (enabled: boolean): void => {
  try {
    const current = getSettings();
    saveSettings({ ...current, isPro: enabled });
  } catch {
    return;
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(AD_FREE_EVENT, { detail: { enabled } }));
    } catch {
      // ignore
    }
  }
};

export const getAdFreeEventName = (): string => AD_FREE_EVENT;
