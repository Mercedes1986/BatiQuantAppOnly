/**
 * Objectif :
 * - Par défaut (aucun choix) : pubs autorisées en "limité / non personnalisées"
 * - Si l'utilisateur accepte : pubs personnalisées + possibilité analytics
 * - Si l'utilisateur refuse : pubs non personnalisées (mais PAS "zéro pub")
 *
 * IMPORTANT :
 * - AdSense : requestNonPersonalizedAds géré dans AdSlot.
 * - GTM : chargé UNIQUEMENT après consentement "accepted".
 * - Consent Mode : on pousse des signaux dans dataLayer pour cohérence.
 */

const CONSENT_KEY_NEW = "batiquant_consent";
const CONSENT_KEY_OLD = "baticalc_consent"; // compat
const DEFAULT_GTM_ID = "GTM-TGMN8KNB";

export type ConsentChoice = "unknown" | "accepted" | "refused";

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
  v: 2,
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

  const ad_storage =
    parsed.ad_storage === "granted" || parsed.ad_storage === "denied"
      ? parsed.ad_storage
      : "denied";

  const analytics_storage =
    parsed.analytics_storage === "granted" || parsed.analytics_storage === "denied"
      ? parsed.analytics_storage
      : "denied";

  let choice: ConsentChoice = "unknown";
  if (typeof parsed.choice === "string") {
    if (parsed.choice === "accepted" || parsed.choice === "refused" || parsed.choice === "unknown") {
      choice = parsed.choice;
    }
  } else {
    const ts = typeof parsed.timestamp === "number" ? parsed.timestamp : 0;
    if (ts > 0) {
      choice = ad_storage === "granted" ? "accepted" : "refused";
    } else {
      choice = "unknown";
    }
  }

  const timestamp = typeof parsed.timestamp === "number" ? parsed.timestamp : 0;

  const ad_user_data =
    parsed.ad_user_data === "granted" || parsed.ad_user_data === "denied"
      ? parsed.ad_user_data
      : choice === "accepted"
        ? "granted"
        : "denied";

  const ad_personalization =
    parsed.ad_personalization === "granted" || parsed.ad_personalization === "denied"
      ? parsed.ad_personalization
      : choice === "accepted"
        ? "granted"
        : "denied";

  const v = typeof parsed.v === "number" ? parsed.v : 1;

  return {
    ad_storage,
    analytics_storage,
    ad_user_data,
    ad_personalization,
    choice,
    timestamp,
    v: Math.max(v, 2),
  };
}

function readRawStoredState(): any {
  if (!isBrowser()) return null;

  const rawNew = localStorage.getItem(CONSENT_KEY_NEW);
  const parsedNew = safeParse(rawNew);
  if (parsedNew) return parsedNew;

  const rawOld = localStorage.getItem(CONSENT_KEY_OLD);
  const parsedOld = safeParse(rawOld);
  if (parsedOld) return parsedOld;

  return null;
}

function writeStoredState(state: ConsentState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CONSENT_KEY_NEW, JSON.stringify(state));
    try {
      localStorage.removeItem(CONSENT_KEY_OLD);
    } catch {}
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
  const c = getConsent();
  return c.choice === "accepted" || c.choice === "refused";
};

export const canServePersonalizedAds = (): boolean => {
  const c = getConsent();
  return (
    c.choice === "accepted" &&
    c.ad_storage === "granted" &&
    c.ad_user_data === "granted" &&
    c.ad_personalization === "granted"
  );
};

export const canServeLimitedAds = (): boolean => {
  return true;
};

export const getAdsMode = (): "personalized" | "limited" => {
  return canServePersonalizedAds() ? "personalized" : "limited";
};

/**
 * ✅ Pousse les signaux dans dataLayer (sans dépendre de gtag)
 * (Si GTM est chargé, il pourra lire dataLayer; sinon c’est inoffensif.)
 */
function pushConsentToDataLayer(state: ConsentState) {
  if (!isBrowser()) return;

  try {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "consent_update",
      ad_storage: state.ad_storage,
      analytics_storage: state.analytics_storage,
      ad_user_data: state.ad_user_data,
      ad_personalization: state.ad_personalization,
      consent_choice: state.choice,
      consent_ts: state.timestamp,
    });
  } catch {}
}

/**
 * ✅ Charge GTM uniquement si accepté
 */
function loadGtmIfAccepted(state: ConsentState) {
  if (!isBrowser()) return;
  if (state.choice !== "accepted") return;

  const gtmId = (import.meta as any)?.env?.VITE_GTM_ID || DEFAULT_GTM_ID;

  try {
    const loader = (window as any).__bqLoadGTM;
    if (typeof loader === "function") loader(gtmId);
  } catch {}
}

/**
 * Appelle ça une fois au boot (par exemple dans main.tsx / App.tsx)
 * - remet dataLayer en cohérence
 * - si déjà accepté (cookie existant) => charge GTM
 */
export const initConsent = (): ConsentState => {
  const state = getConsent();

  // On publie l’état au runtime (utile si GTM se charge ensuite)
  pushConsentToDataLayer(state);

  // Si déjà accepté, on charge GTM immédiatement
  loadGtmIfAccepted(state);

  return state;
};

export const setConsentChoice = (
  choice: Exclude<ConsentChoice, "unknown">
): ConsentState => {
  const now = Date.now();
  const accepted = choice === "accepted";

  const state: ConsentState = {
    ad_storage: accepted ? "granted" : "denied",
    analytics_storage: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
    ad_personalization: accepted ? "granted" : "denied",
    choice,
    timestamp: now,
    v: 2,
  };

  if (isBrowser()) {
    writeStoredState(state);

    // ✅ runtime signals
    pushConsentToDataLayer(state);

    // ✅ GTM only after accept
    loadGtmIfAccepted(state);

    try {
      window.dispatchEvent(new Event("consent-updated"));
    } catch {}
  }

  return state;
};

export const setConsent = (ads: boolean, analytics: boolean): ConsentState => {
  // analytics param conservé pour compat
  if (ads) return setConsentChoice("accepted");
  return setConsentChoice("refused");
};

export const resetConsent = () => {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(CONSENT_KEY_NEW);
  } catch {}
  try {
    localStorage.removeItem(CONSENT_KEY_OLD);
  } catch {}

  const state = { ...DEFAULT_STATE };
  pushConsentToDataLayer(state);

  try {
    window.dispatchEvent(new Event("consent-updated"));
  } catch {}
  try {
    window.dispatchEvent(new Event("consent-open"));
  } catch {}
};