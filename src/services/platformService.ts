import type { AdPlatform } from "@/types/ads";

declare global {
  interface Window {
    BatiQuantNativeAds?: {
      initialize?: () => Promise<void> | void;
      showBanner?: (placement: string) => Promise<void> | void;
      hideBanner?: (placement?: string) => Promise<void> | void;
      showInterstitial?: (placement: string) => Promise<boolean> | boolean;
      openPrivacyOptions?: () => Promise<void> | void;
      canRequestAds?: () => Promise<boolean> | boolean;
      privacyOptionsRequired?: () => Promise<boolean> | boolean;
      printHtmlDocument?: (jobName: string, html: string) => Promise<boolean> | boolean;
      shareHtmlDocument?: (title: string, fileName: string, html: string) => Promise<boolean> | boolean;
      emailHtmlDocument?: (
        to: string,
        subject: string,
        body: string,
        fileName: string,
        html: string,
      ) => Promise<boolean> | boolean;
      downloadHtmlDocument?: (fileName: string, html: string) => Promise<boolean> | boolean;
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

export const getNativeBoolean = (getter: "canRequestAds" | "privacyOptionsRequired"): boolean | null => {
  const bridge = getNativeAdsBridge();
  const candidate = bridge?.[getter];
  if (typeof candidate !== "function") return null;

  try {
    const value = candidate();
    return typeof value === "boolean" ? value : null;
  } catch {
    return null;
  }
};
