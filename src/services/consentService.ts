import {
  canUsePersistentStorage,
  markNamespaceMigrated,
  migrateLegacyKey,
  readJson,
  safeStorageRemove,
  writeJson,
} from "./persistentStorage";

const CONSENT_KEY_NEW = "batiquant_consent";
const CONSENT_KEY_OLD = "baticalc_consent";
const STORAGE_NAMESPACE = "consent";

export type ConsentChoice = "unknown" | "accepted" | "refused";
export type AdsMode = "personalized" | "limited";

export interface ConsentState {
  ad_storage: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  choice: ConsentChoice;
  timestamp: number;
  v: number;
}

const DEFAULT_STATE: ConsentState = {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  choice: "unknown",
  timestamp: 0,
  v: 3,
};

const isBrowser = () => canUsePersistentStorage();

const normalize = (parsed: unknown): ConsentState => {
  const input = parsed && typeof parsed === "object" ? (parsed as Partial<ConsentState>) : {};

  const choice: ConsentChoice =
    input.choice === "accepted" || input.choice === "refused" || input.choice === "unknown"
      ? input.choice
      : typeof input.timestamp === "number" && input.timestamp > 0
        ? input.ad_storage === "granted"
          ? "accepted"
          : "refused"
        : "unknown";

  const accepted = choice === "accepted";
  const ad_storage = input.ad_storage === "granted" || input.ad_storage === "denied"
    ? input.ad_storage
    : accepted
      ? "granted"
      : "denied";
  const analytics_storage =
    input.analytics_storage === "granted" || input.analytics_storage === "denied"
      ? input.analytics_storage
      : accepted
        ? "granted"
        : "denied";
  const ad_user_data = input.ad_user_data === "granted" || input.ad_user_data === "denied"
    ? input.ad_user_data
    : accepted
      ? "granted"
      : "denied";
  const ad_personalization =
    input.ad_personalization === "granted" || input.ad_personalization === "denied"
      ? input.ad_personalization
      : accepted
        ? "granted"
        : "denied";

  return {
    ad_storage,
    analytics_storage,
    ad_user_data,
    ad_personalization,
    choice,
    timestamp: typeof input.timestamp === "number" ? input.timestamp : 0,
    v: typeof input.v === "number" ? Math.max(input.v, 3) : 3,
  };
};

let didMigrate = false;
const ensureMigratedOnce = () => {
  if (didMigrate) return;
  didMigrate = true;

  if (!isBrowser()) return;

  migrateLegacyKey(CONSENT_KEY_NEW, [CONSENT_KEY_OLD]);
  markNamespaceMigrated(STORAGE_NAMESPACE);
};

function readStoredState(): ConsentState {
  if (!isBrowser()) return { ...DEFAULT_STATE };
  ensureMigratedOnce();
  return normalize(readJson<unknown>(CONSENT_KEY_NEW, DEFAULT_STATE));
}

function writeStoredState(state: ConsentState) {
  if (!isBrowser()) return;
  ensureMigratedOnce();
  writeJson(CONSENT_KEY_NEW, state);
  safeStorageRemove(CONSENT_KEY_OLD);
}

function emitConsentUpdated(state: ConsentState) {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: state }));
  } catch {
    // ignore
  }
}

export const getConsent = (): ConsentState => {
  if (!isBrowser()) return { ...DEFAULT_STATE };
  return readStoredState();
};

export const hasUserChoice = (): boolean => {
  const consent = getConsent();
  return consent.choice === "accepted" || consent.choice === "refused";
};

export const canServePersonalizedAds = (): boolean => {
  const consent = getConsent();
  return (
    consent.choice === "accepted" &&
    consent.ad_storage === "granted" &&
    consent.ad_user_data === "granted" &&
    consent.ad_personalization === "granted"
  );
};

export const canServeLimitedAds = (): boolean => true;

export const getAdsMode = (): AdsMode =>
  canServePersonalizedAds() ? "personalized" : "limited";

export const initConsent = (): ConsentState => {
  const state = getConsent();
  emitConsentUpdated(state);
  return state;
};

export const setConsentChoice = (
  choice: Exclude<ConsentChoice, "unknown">
): ConsentState => {
  const accepted = choice === "accepted";
  const state: ConsentState = {
    ad_storage: accepted ? "granted" : "denied",
    analytics_storage: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
    ad_personalization: accepted ? "granted" : "denied",
    choice,
    timestamp: Date.now(),
    v: 3,
  };

  writeStoredState(state);
  emitConsentUpdated(state);
  return state;
};

export const setConsent = (ads: boolean, analytics: boolean): ConsentState => {
  void analytics;
  return setConsentChoice(ads ? "accepted" : "refused");
};

export const resetConsent = () => {
  if (!isBrowser()) return;

  safeStorageRemove(CONSENT_KEY_NEW);
  safeStorageRemove(CONSENT_KEY_OLD);

  const state = { ...DEFAULT_STATE };
  emitConsentUpdated(state);

  try {
    window.dispatchEvent(new Event("consent-open"));
  } catch {
    // ignore
  }
};

export const openConsent = () => {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new Event("consent-open"));
  } catch {
    // ignore
  }
};
