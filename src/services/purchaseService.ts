import {
  getNativeAdsBridge,
  getNativeBoolean,
  getNativeString,
  isNativeAdsBridgeAvailable,
  supportsNativeBillingActions,
  type NativePurchaseEventDetail,
} from "@/services/platformService";
import { getSettings, saveSettings } from "@/services/storage";

const truthy = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const AD_FREE_EVENT = "batiquant:adfree_updated";
const NATIVE_PURCHASE_EVENT = "batiquant-native-purchase";
const PURCHASE_CACHE_KEY = "batiquant:purchase_cache_v2";
const PURCHASE_WAIT_TIMEOUT_MS = 6000;

export type PurchaseSource = "none" | "paid-build" | "billing" | "legacy";

export interface PurchaseRuntimeState {
  entitled: boolean;
  source: PurchaseSource;
  billingReady: boolean;
  productReady: boolean;
  productId: string;
  message?: string;
  updatedAt: number;
}

const defaultState = (): PurchaseRuntimeState => ({
  entitled: false,
  source: "none",
  billingReady: false,
  productReady: false,
  productId: "",
  updatedAt: Date.now(),
});

const isBrowser = () => typeof window !== "undefined";

const readCachedState = (): PurchaseRuntimeState => {
  if (!isBrowser()) return defaultState();

  try {
    const raw = window.localStorage.getItem(PURCHASE_CACHE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PurchaseRuntimeState>;
    return {
      entitled: Boolean(parsed.entitled),
      source: parsed.source === "billing" || parsed.source === "paid-build" || parsed.source === "legacy"
        ? parsed.source
        : "none",
      billingReady: Boolean(parsed.billingReady),
      productReady: Boolean(parsed.productReady),
      productId: typeof parsed.productId === "string" ? parsed.productId : "",
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return defaultState();
  }
};

const writeCachedState = (state: PurchaseRuntimeState) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PURCHASE_CACHE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const mirrorLegacySettings = (entitled: boolean) => {
  try {
    const current = getSettings();
    if (current.isPro === entitled) return;
    saveSettings({ ...current, isPro: entitled });
  } catch {
    // ignore
  }
};

const emitPurchaseState = (state: PurchaseRuntimeState) => {
  writeCachedState(state);
  mirrorLegacySettings(state.entitled);

  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent(AD_FREE_EVENT, { detail: state }));
  } catch {
    // ignore
  }
};

const paidBuildState = (): PurchaseRuntimeState => ({
  entitled: true,
  source: "paid-build",
  billingReady: false,
  productReady: false,
  productId: "",
  updatedAt: Date.now(),
});

const normalizeNativeState = (detail: Partial<NativePurchaseEventDetail>): PurchaseRuntimeState => {
  const entitled = Boolean(detail.entitled);
  const billingReady = Boolean(detail.billingReady);
  const productReady = Boolean(detail.productReady);
  const productId = typeof detail.productId === "string" ? detail.productId : getNativeString("getRemoveAdsProductId") || "";

  return {
    entitled,
    source: entitled ? "billing" : "none",
    billingReady,
    productReady,
    productId,
    message: typeof detail.message === "string" ? detail.message : undefined,
    updatedAt: Date.now(),
  };
};

const readNativeSnapshot = (): PurchaseRuntimeState | null => {
  if (!isNativeAdsBridgeAvailable()) return null;

  const entitled = getNativeBoolean("isAdFreePurchased");
  const billingReady = getNativeBoolean("isBillingReady");
  const productReady = getNativeBoolean("isRemoveAdsProductReady");
  const productId = getNativeString("getRemoveAdsProductId") || "";

  if (entitled === null && billingReady === null && productReady === null && !productId) {
    return null;
  }

  return {
    entitled: Boolean(entitled),
    source: entitled ? "billing" : "none",
    billingReady: Boolean(billingReady),
    productReady: Boolean(productReady),
    productId,
    updatedAt: Date.now(),
  };
};

const waitForPurchaseUpdate = (
  acceptedPhases: readonly string[],
  timeoutMs = PURCHASE_WAIT_TIMEOUT_MS,
): Promise<PurchaseRuntimeState> => {
  if (!isBrowser()) {
    return Promise.resolve(getPurchaseRuntimeState());
  }

  return new Promise((resolve, reject) => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<NativePurchaseEventDetail>).detail;
      if (!detail || !acceptedPhases.includes(detail.phase)) return;

      cleanup();

      if (detail.phase === "purchase-error") {
        reject(new Error(detail.message || "purchase-error"));
        return;
      }

      if (detail.phase === "purchase-cancelled") {
        reject(new Error(detail.message || "purchase-cancelled"));
        return;
      }

      const nextState = normalizeNativeState(detail);
      emitPurchaseState(nextState);
      resolve(nextState);
    };

    const cleanup = () => {
      window.removeEventListener(NATIVE_PURCHASE_EVENT, onEvent as EventListener);
      window.clearTimeout(timeoutId);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      const snapshot = getPurchaseRuntimeState();
      if (acceptedPhases.includes("status") || snapshot.entitled) {
        resolve(snapshot);
      } else {
        reject(new Error("purchase-timeout"));
      }
    }, timeoutMs);

    window.addEventListener(NATIVE_PURCHASE_EVENT, onEvent as EventListener);
  });
};

export const isPaidAppBuild = (): boolean => truthy(import.meta.env.VITE_PAID_APP ?? "false");

export const getPurchaseRuntimeState = (): PurchaseRuntimeState => {
  if (isPaidAppBuild()) return paidBuildState();

  const cached = readCachedState();
  const nativeSnapshot = readNativeSnapshot();

  if (!nativeSnapshot) return cached;

  const merged: PurchaseRuntimeState = {
    entitled: nativeSnapshot.entitled,
    source: nativeSnapshot.entitled ? "billing" : "none",
    billingReady: nativeSnapshot.billingReady,
    productReady: nativeSnapshot.productReady,
    productId: nativeSnapshot.productId || cached.productId,
    message: nativeSnapshot.message || cached.message,
    updatedAt: Date.now(),
  };

  return merged;
};

export const hasAdFreeEntitlement = (): boolean => {
  if (isPaidAppBuild()) return true;
  const disableAdsForPro = truthy(import.meta.env.VITE_DISABLE_ADS_FOR_PRO ?? "true");
  if (!disableAdsForPro) return false;
  return getPurchaseRuntimeState().entitled;
};

export const initializePurchaseState = async (): Promise<PurchaseRuntimeState> => {
  if (isPaidAppBuild()) {
    const state = paidBuildState();
    emitPurchaseState(state);
    return state;
  }

  if (!supportsNativeBillingActions()) {
    const cached = readCachedState();
    if (cached.source === "none") {
      try {
        if (getSettings().isPro) {
          const migrated: PurchaseRuntimeState = {
            ...cached,
            entitled: true,
            source: "legacy",
            updatedAt: Date.now(),
          };
          emitPurchaseState(migrated);
          return migrated;
        }
      } catch {
        // ignore
      }
    }

    emitPurchaseState(cached);
    return cached;
  }

  const bridge = getNativeAdsBridge();
  try {
    bridge?.initializeBilling?.();
    bridge?.refreshPurchases?.();
  } catch {
    // ignore, fall back to cached snapshot
  }

  const snapshot = getPurchaseRuntimeState();
  emitPurchaseState(snapshot);

  try {
    return await waitForPurchaseUpdate(["status", "restore-complete", "purchase-success"], 4500);
  } catch {
    return getPurchaseRuntimeState();
  }
};

export const refreshPurchaseState = async (): Promise<PurchaseRuntimeState> => {
  if (isPaidAppBuild()) {
    const state = paidBuildState();
    emitPurchaseState(state);
    return state;
  }

  if (!supportsNativeBillingActions()) {
    const state = getPurchaseRuntimeState();
    emitPurchaseState(state);
    return state;
  }

  const bridge = getNativeAdsBridge();
  bridge?.refreshPurchases?.();
  const nextState = await waitForPurchaseUpdate(["status", "restore-complete", "purchase-success"]);
  emitPurchaseState(nextState);
  return nextState;
};

export const startRemoveAdsPurchase = async (): Promise<PurchaseRuntimeState> => {
  if (isPaidAppBuild()) {
    const state = paidBuildState();
    emitPurchaseState(state);
    return state;
  }

  if (!supportsNativeBillingActions()) {
    throw new Error("billing-unavailable");
  }

  const bridge = getNativeAdsBridge();
  const started = bridge?.launchRemoveAdsPurchase?.();
  if (started === false) {
    throw new Error("purchase-not-started");
  }

  const nextState = await waitForPurchaseUpdate([
    "purchase-success",
    "purchase-cancelled",
    "purchase-error",
    "restore-complete",
    "status",
  ]);

  emitPurchaseState(nextState);
  return nextState;
};

export const restoreAdFreePurchases = async (): Promise<PurchaseRuntimeState> => {
  return refreshPurchaseState();
};

export const setAdFreeEntitlement = (enabled: boolean): void => {
  const nextState: PurchaseRuntimeState = {
    ...getPurchaseRuntimeState(),
    entitled: enabled,
    source: enabled ? "legacy" : "none",
    updatedAt: Date.now(),
  };

  emitPurchaseState(nextState);
};

export const getAdFreeEventName = (): string => AD_FREE_EVENT;
