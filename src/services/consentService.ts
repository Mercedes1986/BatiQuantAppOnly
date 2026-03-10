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
  v: 4,
};

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof localStorage !== "undefined";

const safeParse = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function normalize(parsed: unknown): ConsentState {
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };
  const value = parsed as Partial<ConsentState> & { timestamp?: number };

  const choice: ConsentChoice =
    value.choice === "accepted" || value.choice === "refused" || value.choice === "unknown"
      ? value.choice
      : typeof value.timestamp === "number" && value.timestamp > 0
        ? value.ad_storage === "granted"
          ? "accepted"
          : "refused"
        : "unknown";

  const accepted = choice === "accepted";

  return {
    ad_storage:
      value.ad_storage === "granted" || value.ad_storage === "denied"
        ? value.ad_storage
        : accepted
          ? "granted"
          : "denied",
    analytics_storage:
      value.analytics_storage === "granted" || value.analytics_storage === "denied"
        ? value.analytics_storage
        : accepted
          ? "granted"
          : "denied",
    ad_user_data:
      value.ad_user_data === "granted" || value.ad_user_data === "denied"
        ? value.ad_user_data
        : accepted
          ? "granted"
          : "denied",
    ad_personalization:
      value.ad_personalization === "granted" || value.ad_personalization === "denied"
        ? value.ad_personalization
        : accepted
          ? "granted"
          : "denied",
    choice,
    timestamp: typeof value.timestamp === "number" ? value.timestamp : 0,
    v: typeof value.v === "number" ? Math.max(value.v, 4) : 4,
  };
}

function readRawStoredState(): unknown {
  if (!isBrowser()) return null;
  const next = safeParse(localStorage.getItem(CONSENT_KEY_NEW));
  if (next) return next;
  return safeParse(localStorage.getItem(CONSENT_KEY_OLD));
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
    window.dispatchEvent(new CustomEvent<ConsentState>("consent-updated", { detail: state }));
  } catch {
    // ignore event failures
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
    v: 4,
  };

  writeStoredState(state);
  emitConsentUpdated(state);
  return state;
};

export const setConsent = (ads: boolean, analytics: boolean): ConsentState => {
  void analytics;
  return setConsentChoice(ads ? "accepted" : "refused");
};

export const resetConsent = (): ConsentState => {
  if (isBrowser()) {
    try {
      localStorage.removeItem(CONSENT_KEY_NEW);
      localStorage.removeItem(CONSENT_KEY_OLD);
    } catch {
      // ignore
    }
  }

  const state = { ...DEFAULT_STATE };
  emitConsentUpdated(state);

  if (isBrowser()) {
    try {
      window.dispatchEvent(new Event("consent-open"));
    } catch {
      // ignore
    }
  }

  return state;
};

export const openConsent = (): void => {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new Event("consent-open"));
  } catch {
    // ignore
  }
};

export const subscribeToConsent = (callback: (state: ConsentState) => void): (() => void) => {
  if (!isBrowser()) return () => undefined;

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ConsentState>).detail;
    callback(detail || getConsent());
  };

  window.addEventListener("consent-updated", handler);
  return () => window.removeEventListener("consent-updated", handler);
};
