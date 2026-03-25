import { AD_CONFIG } from "@/config/adsConfig";
import {
  canServeLimitedAds,
  canServePersonalizedAds,
  getAdsMode,
  getConsent,
  openConsent,
  resetConsent,
} from "@/services/consentService";
import {
  getNativeAdsBridge,
  getNativeBoolean,
  isNativeAdsBridgeAvailable,
} from "@/services/platformService";
import type { PrivacyState } from "@/types/privacy";

export const getPrivacyPolicyUrl = (): string =>
  AD_CONFIG.PRIVACY_POLICY_URL || "/privacy-policy.html";

export const getPrivacyState = (): PrivacyState => {
  const consent = getConsent();
  const nativeCanRequestAds = getNativeBoolean("canRequestAds");
  const nativePrivacyOptionsRequired = getNativeBoolean("privacyOptionsRequired");

  return {
    consentChoice: consent.choice,
    canRequestAds: nativeCanRequestAds ?? canServeLimitedAds(),
    canServePersonalizedAds: canServePersonalizedAds(),
    adsMode: getAdsMode(),
    privacyOptionsRequired: nativePrivacyOptionsRequired ?? true,
    privacyEntryPoint: isNativeAdsBridgeAvailable() ? "native" : "settings",
  };
};

export const openPrivacyOptions = async (): Promise<void> => {
  if (isNativeAdsBridgeAvailable()) {
    try {
      await getNativeAdsBridge()?.openPrivacyOptions?.();
      return;
    } catch {
      // fallback below
    }
  }

  openConsent();
};

export const resetPrivacyChoices = (): void => {
  resetConsent();
};
