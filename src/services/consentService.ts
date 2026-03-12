const CONSENT_KEY_NEW = "batiquant_consent";
const CONSENT_KEY_OLD = "baticalc_consent";

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

const isBrowser = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const safeParse = (raw: string | null): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function normalize(parsed: any): ConsentState {
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };

  const choice: ConsentChoice =
    parsed.choice === "accepted" || parsed.choice === "refused" || parsed.choice === "unknown"
      ? parsed.choice
      : typeof parsed.timestamp === "number" && parsed.timestamp > 0
        ? parsed.ad_storage === "granted"
          ? "accepted"
          : "refused"
        : "unknown";

  const accepted = choice === "accepted";
  const ad_storage = parsed.ad_storage === "granted" || parsed.ad_storage === "denied"
    ? parsed.ad_storage
    : accepted
      ? "granted"
      : "denied";
  const analytics_storage = parsed.analytics_storage === "granted" || parsed.analytics_storage === "denied"
    ? parsed.analytics_storage
    : accepted
      ? "granted"
      : "denied";
  const ad_user_data = parsed.ad_user_data === "granted" || parsed.ad_user_data === "denied"
    ? parsed.ad_user_data
    : accepted
      ? "granted"
      : "denied";
  const ad_personalization = parsed.ad_personalization === "granted" || parsed.ad_personalization === "denied"
    ? parsed.ad_personalization
    : accepted
      ? "granted"
      : "denied";

  return {
    ad_storage,
    analytics_storage,
    ad_user_data,
    ad_personalization,
    choice,
    timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : 0,
    v: typeof parsed.v === "number" ? Math.max(parsed.v, 3) : 3,
  };
}

function readRawStoredState(): any {
  if (!isBrowser()) return null;
  const next = safeParse(localStorage.getItem(CONSENT_KEY_NEW));
  if (next) return next;
  const legacy = safeParse(localStorage.getItem(CONSENT_KEY_OLD));
  if (legacy) return legacy;
  return null;
}

function writeStoredState(state: ConsentState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CONSENT_KEY_NEW, JSON.stringify(state));
    localStorage.removeItem(CONSENT_KEY_OLD);
  } catch {
    // ignore storage failures
  }
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
  const parsed = readRawStoredState();
  const normalized = normalize(parsed);

  if (parsed && !localStorage.getItem(CONSENT_KEY_NEW)) {
    writeStoredState(normalized);
  }

  return normalized;
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
  try {
    localStorage.removeItem(CONSENT_KEY_NEW);
    localStorage.removeItem(CONSENT_KEY_OLD);
  } catch {
    // ignore
  }

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
