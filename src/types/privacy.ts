export type PrivacyEntryPoint = "none" | "settings" | "native";

export interface PrivacyState {
  consentChoice: "unknown" | "accepted" | "refused";
  canRequestAds: boolean;
  canServePersonalizedAds: boolean;
  adsMode: "personalized" | "limited";
  privacyOptionsRequired: boolean;
  privacyEntryPoint: PrivacyEntryPoint;
}