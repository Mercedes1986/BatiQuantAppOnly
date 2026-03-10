import { AD_CONFIG, getAdPermission, getAdUnitId, hasMobileAppId } from "@/config/adsConfig";
import { canServeLimitedAds } from "@/services/consentService";
import { getNativeAdsBridge, getPlatform, isNativeAdsBridgeAvailable } from "@/services/platformService";
import type { AdInterstitialResult, AdPlacement, AdRuntimeState, AdSlotRenderState } from "@/types/ads";

let initialized = false;

export const getAdsRuntimeState = (): AdRuntimeState => ({
  platform: getPlatform(),
  enabled: AD_CONFIG.ENABLE_ADS,
  initialized,
  canRequestAds: canServeLimitedAds(),
  debug: AD_CONFIG.ENABLE_DEBUG_LABELS,
});

export const initializeAds = async (): Promise<AdRuntimeState> => {
  if (!AD_CONFIG.ENABLE_ADS) return getAdsRuntimeState();

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
  if (!AD_CONFIG.ENABLE_ADS) {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  if (!canServeLimitedAds()) {
    return { shouldRender: false, showPlaceholder: false, reason: "no-consent" };
  }

  const permission = getAdPermission(pathname);
  if (permission === "deny") {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  const platform = getPlatform();
  const unitId = getAdUnitId(placement);

  if (platform === "mobile" && hasMobileAppId() && unitId && isNativeAdsBridgeAvailable()) {
    return { shouldRender: true, showPlaceholder: false, reason: "mobile-ready" };
  }

  if (platform === "mobile" && hasMobileAppId() && !isNativeAdsBridgeAvailable()) {
    return { shouldRender: true, showPlaceholder: true, reason: "mobile-bridge-missing" };
  }

  return { shouldRender: true, showPlaceholder: true, reason: "web-placeholder" };
};

export const showBanner = async (
  placement: Extract<AdPlacement, "dashboard_banner" | "calculator_result_banner">
): Promise<boolean> => {
  if (!isNativeAdsBridgeAvailable()) return false;
  try {
    await getNativeAdsBridge()?.showBanner?.(placement);
    return true;
  } catch {
    return false;
  }
};

export const hideBanner = async (
  placement?: Extract<AdPlacement, "dashboard_banner" | "calculator_result_banner">
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
  if (!isNativeAdsBridgeAvailable()) return { shown: false, reason: "bridge-missing" };

  try {
    const shown = await getNativeAdsBridge()?.showInterstitial?.(placement);
    return shown ? { shown: true, reason: "shown" } : { shown: false, reason: "not-ready" };
  } catch {
    return { shown: false, reason: "not-ready" };
  }
};