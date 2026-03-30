export type AdPlatform = "none" | "web" | "mobile";
export type AdPlacement =
  | "dashboard_banner"
  | "projects_banner"
  | "house_banner"
  | "materials_banner"
  | "quicktools_banner"
  | "calculator_result_banner"
  | "calculator_interstitial";

export type AdSlotVariant = "banner" | "inline" | "rectangle";

export interface AdRuntimeState {
  platform: AdPlatform;
  enabled: boolean;
  initialized: boolean;
  canRequestAds: boolean;
  debug: boolean;
}

export interface AdSlotRenderState {
  shouldRender: boolean;
  showPlaceholder: boolean;
  reason:
    | "disabled"
    | "no-consent"
    | "web-placeholder"
    | "mobile-bridge-missing"
    | "mobile-ready";
}

export interface AdInterstitialResult {
  shown: boolean;
  reason:
    | "disabled"
    | "ad-free"
    | "not-ready"
    | "bridge-missing"
    | "cooldown"
    | "frequency-capped"
    | "duplicate-result"
    | "shown";
}

export type NativeInterstitialPhase = "shown" | "dismissed" | "failed";
