import { AD_CONFIG, getAdPermission } from "@/config/adsConfig";
import { canServeLimitedAds } from "@/services/consentService";
import { getAdFreeEventName, hasAdFreeEntitlement } from "@/services/purchaseService";
import {
  getNativeAdsBridge,
  getNativeBoolean,
  getPlatform,
  isNativeAdsBridgeAvailable,
} from "@/services/platformService";
import type {
  AdInterstitialResult,
  AdPlacement,
  AdRuntimeState,
  AdSlotRenderState,
} from "@/types/ads";

let initialized = false;
let interstitialTriggerCount = 0;
let lastInterstitialShownAt = 0;

const getCanRequestAds = (): boolean => {
  const nativeCanRequestAds = getNativeBoolean("canRequestAds");
  return nativeCanRequestAds ?? canServeLimitedAds();
};

export const getAdsRuntimeState = (): AdRuntimeState => ({
  platform: getPlatform(),
  enabled: AD_CONFIG.ENABLE_ADS && !hasAdFreeEntitlement(),
  initialized,
  canRequestAds: getCanRequestAds(),
  debug: AD_CONFIG.ENABLE_DEBUG_LABELS,
});

export const initializeAds = async (): Promise<AdRuntimeState> => {
  if (!AD_CONFIG.ENABLE_ADS || hasAdFreeEntitlement()) return getAdsRuntimeState();

  if (getPlatform() === "mobile" && isNativeAdsBridgeAvailable()) {
    try {
      await getNativeAdsBridge()?.initialize?.();
      initialized = true;
    } catch {
      initialized = false;
    }
  } else {
    initialized = true;
  }

  return getAdsRuntimeState();
};

export const getAdRenderState = (
  pathname: string,
  placement: AdPlacement
): AdSlotRenderState => {
  if (!AD_CONFIG.ENABLE_ADS || hasAdFreeEntitlement()) {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  const permission = getAdPermission(pathname);
  if (permission === "deny") {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  const platform = getPlatform();

  if (platform === "mobile" && isNativeAdsBridgeAvailable()) {
    return { shouldRender: true, showPlaceholder: false, reason: "mobile-ready" };
  }

  if (!getCanRequestAds()) {
    return { shouldRender: false, showPlaceholder: false, reason: "no-consent" };
  }

  if (platform === "mobile") {
    return {
      shouldRender: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
      showPlaceholder: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
      reason: "mobile-bridge-missing",
    };
  }

  void placement;
  return {
    shouldRender: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
    showPlaceholder: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
    reason: "web-placeholder",
  };
};

export const showBanner = async (
  placement: Exclude<AdPlacement, "calculator_interstitial">
): Promise<boolean> => {
  if (hasAdFreeEntitlement()) return false;
  if (!isNativeAdsBridgeAvailable()) return false;
  try {
    await getNativeAdsBridge()?.showBanner?.(placement);
    return true;
  } catch {
    return false;
  }
};

export const hideBanner = async (
  placement?: Exclude<AdPlacement, "calculator_interstitial">
): Promise<boolean> => {
  if (!isNativeAdsBridgeAvailable()) return false;
  try {
    await getNativeAdsBridge()?.hideBanner?.(placement);
    return true;
  } catch {
    return false;
  }
};

export const showInterstitialIfReady = async (
  placement: Extract<AdPlacement, "calculator_interstitial">
): Promise<AdInterstitialResult> => {
  if (!AD_CONFIG.ENABLE_ADS) return { shown: false, reason: "disabled" };
  if (hasAdFreeEntitlement()) return { shown: false, reason: "ad-free" };

  interstitialTriggerCount += 1;

  if (interstitialTriggerCount < AD_CONFIG.INTERSTITIAL_EVERY_N_RESULTS) {
    return { shown: false, reason: "frequency-capped" };
  }

  const now = Date.now();
  if (now - lastInterstitialShownAt < AD_CONFIG.INTERSTITIAL_COOLDOWN_MS) {
    return { shown: false, reason: "cooldown" };
  }

  if (!getCanRequestAds()) return { shown: false, reason: "not-ready" };
  if (!isNativeAdsBridgeAvailable()) return { shown: false, reason: "bridge-missing" };

  try {
    const shown = await getNativeAdsBridge()?.showInterstitial?.(placement);
    if (shown) {
      interstitialTriggerCount = 0;
      lastInterstitialShownAt = now;
      return { shown: true, reason: "shown" };
    }
    return { shown: false, reason: "not-ready" };
  } catch {
    return { shown: false, reason: "not-ready" };
  }
};

export const getAdLifecycleEvents = () => ({
  adFreeUpdated: getAdFreeEventName(),
});
