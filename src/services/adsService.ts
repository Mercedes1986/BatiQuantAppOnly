import { AD_CONFIG, getAdPermission } from "@/config/adsConfig";
import { canServeLimitedAds } from "@/services/consentService";
import { getAdFreeEventName, hasAdFreeEntitlement } from "@/services/purchaseService";
import {
  getNativeAdsBridge,
  getNativeBoolean,
  getPlatform,
  isNativeAdsBridgeAvailable,
} from "@/services/platformService";
import type {
  AdInterstitialResult,
  AdPlacement,
  AdRuntimeState,
  AdSlotRenderState,
  NativeInterstitialPhase,
} from "@/types/ads";

let initialized = false;
let interstitialOpportunityCount = 0;
let lastInterstitialShownAt = 0;
let lastInterstitialContextKey = "";
let lastInterstitialContextAt = 0;
let pendingInterstitialPlacement: Extract<AdPlacement, "calculator_interstitial"> | null = null;
let pendingInterstitialContextKey = "";

const NATIVE_INTERSTITIAL_EVENT = "batiquant-interstitial";

const getCanRequestAds = (): boolean => {
  const nativeCanRequestAds = getNativeBoolean("canRequestAds");
  return nativeCanRequestAds ?? canServeLimitedAds();
};

const isBannerPlacement = (placement: AdPlacement): placement is Exclude<AdPlacement, "calculator_interstitial"> =>
  placement !== "calculator_interstitial";

const waitForInterstitialLifecycle = (
  placement: Extract<AdPlacement, "calculator_interstitial">,
): Promise<{ sawShown: boolean; phase: NativeInterstitialPhase | "timeout" }> => {
  if (typeof window === "undefined") {
    return Promise.resolve({ sawShown: false, phase: "timeout" });
  }

  return new Promise((resolve) => {
    let sawShown = false;

    const cleanup = (phase: NativeInterstitialPhase | "timeout") => {
      clearTimeout(timer);
      window.removeEventListener(NATIVE_INTERSTITIAL_EVENT, onEvent as EventListener);
      resolve({ sawShown, phase });
    };

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ placement?: string; phase?: NativeInterstitialPhase }>).detail;
      if (!detail || detail.placement !== placement || !detail.phase) return;

      if (detail.phase === "shown") {
        sawShown = true;
        return;
      }

      cleanup(detail.phase);
    };

    const timer = window.setTimeout(() => cleanup("timeout"), AD_CONFIG.INTERSTITIAL_WAIT_TIMEOUT_MS);
    window.addEventListener(NATIVE_INTERSTITIAL_EVENT, onEvent as EventListener);
  });
};

const clearPendingInterstitialInternal = () => {
  pendingInterstitialPlacement = null;
  pendingInterstitialContextKey = "";
};

export const getAdsRuntimeState = (): AdRuntimeState => ({
  platform: getPlatform(),
  enabled: AD_CONFIG.ENABLE_ADS && !hasAdFreeEntitlement(),
  initialized,
  canRequestAds: getCanRequestAds(),
  debug: AD_CONFIG.ENABLE_DEBUG_LABELS,
});

export const initializeAds = async (): Promise<AdRuntimeState> => {
  if (!AD_CONFIG.ENABLE_ADS || hasAdFreeEntitlement()) return getAdsRuntimeState();

  if (getPlatform() === "mobile" && isNativeAdsBridgeAvailable()) {
    try {
      await getNativeAdsBridge()?.initialize?.();
      initialized = true;
    } catch {
      initialized = false;
    }
  } else {
    initialized = true;
  }

  return getAdsRuntimeState();
};

export const getAdRenderState = (
  pathname: string,
  placement: AdPlacement,
): AdSlotRenderState => {
  if (!AD_CONFIG.ENABLE_ADS || hasAdFreeEntitlement()) {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  if (isBannerPlacement(placement) && !AD_CONFIG.ENABLE_INLINE_BANNERS) {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  const permission = getAdPermission(pathname);
  if (permission === "deny") {
    return { shouldRender: false, showPlaceholder: false, reason: "disabled" };
  }

  const platform = getPlatform();

  if (platform === "mobile" && isNativeAdsBridgeAvailable()) {
    return { shouldRender: true, showPlaceholder: false, reason: "mobile-ready" };
  }

  if (!getCanRequestAds()) {
    return { shouldRender: false, showPlaceholder: false, reason: "no-consent" };
  }

  if (platform === "mobile") {
    return {
      shouldRender: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
      showPlaceholder: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
      reason: "mobile-bridge-missing",
    };
  }

  return {
    shouldRender: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
    showPlaceholder: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
    reason: "web-placeholder",
  };
};

export const showBanner = async (
  placement: Exclude<AdPlacement, "calculator_interstitial">,
): Promise<boolean> => {
  if (!AD_CONFIG.ENABLE_INLINE_BANNERS) return false;
  if (hasAdFreeEntitlement()) return false;
  if (!isNativeAdsBridgeAvailable()) return false;
  try {
    await getNativeAdsBridge()?.showBanner?.(placement);
    return true;
  } catch {
    return false;
  }
};

export const hideBanner = async (
  placement?: Exclude<AdPlacement, "calculator_interstitial">,
): Promise<boolean> => {
  if (!AD_CONFIG.ENABLE_INLINE_BANNERS) return false;
  if (!isNativeAdsBridgeAvailable()) return false;
  try {
    await getNativeAdsBridge()?.hideBanner?.(placement);
    return true;
  } catch {
    return false;
  }
};

export const armInterstitialAfterCalculation = (
  placement: Extract<AdPlacement, "calculator_interstitial">,
  options?: { contextKey?: string },
): AdInterstitialResult => {
  if (!AD_CONFIG.ENABLE_ADS) return { shown: false, reason: "disabled" };
  if (hasAdFreeEntitlement()) return { shown: false, reason: "ad-free" };

  if (options?.contextKey) {
    const now = Date.now();
    const isDuplicate =
      lastInterstitialContextKey === options.contextKey &&
      now - lastInterstitialContextAt < AD_CONFIG.INTERSTITIAL_REPEAT_RESULT_WINDOW_MS;

    lastInterstitialContextKey = options.contextKey;
    lastInterstitialContextAt = now;

    if (isDuplicate) {
      clearPendingInterstitialInternal();
      return { shown: false, reason: "duplicate-result" };
    }
  }

  interstitialOpportunityCount += 1;

  if (interstitialOpportunityCount < AD_CONFIG.INTERSTITIAL_EVERY_N_RESULTS) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "frequency-capped" };
  }

  const now = Date.now();
  if (now - lastInterstitialShownAt < AD_CONFIG.INTERSTITIAL_COOLDOWN_MS) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "cooldown" };
  }

  if (!getCanRequestAds()) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "not-ready" };
  }

  if (!isNativeAdsBridgeAvailable()) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "bridge-missing" };
  }

  pendingInterstitialPlacement = placement;
  pendingInterstitialContextKey = options?.contextKey || "";
  return { shown: false, reason: "armed" };
};

export const showPendingInterstitialIfReady = async (
  placement: Extract<AdPlacement, "calculator_interstitial">,
): Promise<AdInterstitialResult> => {
  if (!AD_CONFIG.ENABLE_ADS) return { shown: false, reason: "disabled" };
  if (hasAdFreeEntitlement()) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "ad-free" };
  }

  if (pendingInterstitialPlacement !== placement) {
    return { shown: false, reason: "not-ready" };
  }

  if (!getCanRequestAds()) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "not-ready" };
  }

  if (!isNativeAdsBridgeAvailable()) {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "bridge-missing" };
  }

  try {
    const lifecyclePromise = waitForInterstitialLifecycle(placement);
    const shown = await getNativeAdsBridge()?.showInterstitial?.(placement);
    if (!shown) {
      clearPendingInterstitialInternal();
      return { shown: false, reason: "not-ready" };
    }

    const lifecycle = await lifecyclePromise;
    const completedSuccessfully =
      lifecycle.phase === "dismissed" || (lifecycle.phase === "timeout" && lifecycle.sawShown);

    clearPendingInterstitialInternal();

    if (completedSuccessfully) {
      interstitialOpportunityCount = 0;
      lastInterstitialShownAt = Date.now();
      return { shown: true, reason: "shown" };
    }

    return { shown: false, reason: "not-ready" };
  } catch {
    clearPendingInterstitialInternal();
    return { shown: false, reason: "not-ready" };
  }
};

export const clearPendingInterstitial = (
  placement?: Extract<AdPlacement, "calculator_interstitial">,
): void => {
  if (!placement || pendingInterstitialPlacement === placement) {
    clearPendingInterstitialInternal();
  }
};

export const showInterstitialIfReady = async (
  placement: Extract<AdPlacement, "calculator_interstitial">,
  options?: { contextKey?: string },
): Promise<AdInterstitialResult> => {
  const armed = armInterstitialAfterCalculation(placement, options);
  if (armed.reason !== "armed") {
    return armed;
  }
  return showPendingInterstitialIfReady(placement);
};

export const getAdLifecycleEvents = () => ({
  adFreeUpdated: getAdFreeEventName(),
});
