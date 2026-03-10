import { AD_CONFIG } from "@/config/adsConfig";
import {
  canServePersonalizedAds,
  getAdsMode,
  getConsent,
  openConsent,
  resetConsent,
} from "@/services/consentService";
import { getNativeAdsBridge, isNativeAdsBridgeAvailable } from "@/services/platformService";
import type { PrivacyState } from "@/types/privacy";

export const getPrivacyPolicyUrl = (): string =>
  AD_CONFIG.PRIVACY_POLICY_URL || "/privacy-policy.html";

export const getPrivacyState = (): PrivacyState => {
  const consent = getConsent();

  return {
    consentChoice: consent.choice,
    canRequestAds: true,
    canServePersonalizedAds: canServePersonalizedAds(),
    adsMode: getAdsMode(),
    privacyOptionsRequired: true,
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