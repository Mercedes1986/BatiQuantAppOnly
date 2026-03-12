import type { AdPlatform } from "@/types/ads";

declare global {
  interface Window {
    BatiQuantNativeAds?: {
      initialize?: () => Promise<void> | void;
      showBanner?: (placement: string) => Promise<void> | void;
      hideBanner?: (placement?: string) => Promise<void> | void;
      showInterstitial?: (placement: string) => Promise<boolean> | boolean;
      openPrivacyOptions?: () => Promise<void> | void;
    };
  }
}

const isBrowser = () => typeof window !== "undefined";

export const isNativeAdsBridgeAvailable = (): boolean =>
  isBrowser() && typeof window.BatiQuantNativeAds === "object" && window.BatiQuantNativeAds !== null;

export const getPlatform = (): AdPlatform => {
  const forced = import.meta.env.VITE_AD_PLATFORM;
  if (forced === "none" || forced === "web" || forced === "mobile") return forced;
  if (isNativeAdsBridgeAvailable()) return "mobile";
  return "web";
};

export const getNativeAdsBridge = () =>
  isNativeAdsBridgeAvailable() ? window.BatiQuantNativeAds! : null;