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
      openPdfDocument?: (requestId: string, title: string, fileName: string, html: string) => Promise<boolean> | boolean;
      sharePdfDocument?: (
        requestId: string,
        title: string,
        fileName: string,
        html: string,
        chooserTitle?: string,
      ) => Promise<boolean> | boolean;
      emailPdfDocument?: (
        requestId: string,
        to: string,
        subject: string,
        body: string,
        fileName: string,
        html: string,
        chooserTitle?: string,
      ) => Promise<boolean> | boolean;
      downloadPdfDocument?: (requestId: string, fileName: string, html: string) => Promise<boolean> | boolean;
      downloadBackupJson?: (requestId: string, fileName: string, json: string) => Promise<boolean> | boolean;
      initializeBilling?: () => Promise<void> | void;
      refreshPurchases?: () => Promise<void> | void;
      launchRemoveAdsPurchase?: () => Promise<boolean> | boolean;
      isAdFreePurchased?: () => Promise<boolean> | boolean;
      isBillingReady?: () => Promise<boolean> | boolean;
      isRemoveAdsProductReady?: () => Promise<boolean> | boolean;
      getRemoveAdsProductId?: () => Promise<string> | string;
    };
  }
}

export type NativeDocumentAction = "open" | "share" | "email" | "download";

export interface NativeDocumentRequest {
  title: string;
  fileName: string;
  html: string;
  chooserTitle?: string;
  to?: string;
  subject?: string;
  body?: string;
}

export interface NativeDocumentEventDetail {
  requestId: string;
  action: NativeDocumentAction;
  phase: "success" | "error";
  message?: string;
}

export interface NativeBackupEventDetail {
  requestId: string;
  phase: "success" | "error";
  message?: string;
}

export type NativePurchasePhase =
  | "status"
  | "purchase-success"
  | "purchase-cancelled"
  | "purchase-error"
  | "restore-complete";

export interface NativePurchaseEventDetail {
  phase: NativePurchasePhase;
  entitled: boolean;
  billingReady: boolean;
  productReady: boolean;
  productId?: string;
  message?: string;
}

const DOCUMENT_EVENT_NAME = "batiquant-native-document";
const BACKUP_EVENT_NAME = "batiquant-native-backup";
const DOCUMENT_ACTION_TIMEOUT_MS = 30000;
const BACKUP_ACTION_TIMEOUT_MS = 30000;

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

export const getNativeBoolean = (
  getter:
    | "canRequestAds"
    | "privacyOptionsRequired"
    | "isAdFreePurchased"
    | "isBillingReady"
    | "isRemoveAdsProductReady",
): boolean | null => {
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

export const getNativeString = (
  getter: "getRemoveAdsProductId",
): string | null => {
  const bridge = getNativeAdsBridge();
  const candidate = bridge?.[getter];
  if (typeof candidate !== "function") return null;

  try {
    const value = candidate();
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
};

export const supportsNativeDocumentActions = (): boolean => {
  const bridge = getNativeAdsBridge();
  return !!(
    bridge &&
    typeof bridge.openPdfDocument === "function" &&
    typeof bridge.sharePdfDocument === "function" &&
    typeof bridge.emailPdfDocument === "function" &&
    typeof bridge.downloadPdfDocument === "function"
  );
};

export const supportsNativeBackupActions = (): boolean => {
  const bridge = getNativeAdsBridge();
  return !!(bridge && typeof bridge.downloadBackupJson === "function");
};

export const supportsNativeBillingActions = (): boolean => {
  const bridge = getNativeAdsBridge();
  return !!(
    bridge &&
    typeof bridge.initializeBilling === "function" &&
    typeof bridge.refreshPurchases === "function" &&
    typeof bridge.launchRemoveAdsPurchase === "function"
  );
};

const createRequestId = () =>
  `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const parseDocumentEvent = (event: Event): NativeDocumentEventDetail | null => {
  const customEvent = event as CustomEvent<NativeDocumentEventDetail>;
  if (!customEvent?.detail) return null;
  const detail = customEvent.detail;
  if (!detail.requestId || !detail.action || !detail.phase) return null;
  return detail;
};

const parseBackupEvent = (event: Event): NativeBackupEventDetail | null => {
  const customEvent = event as CustomEvent<NativeBackupEventDetail>;
  if (!customEvent?.detail) return null;
  const detail = customEvent.detail;
  if (!detail.requestId || !detail.phase) return null;
  return detail;
};

export const runNativeDocumentAction = (
  action: NativeDocumentAction,
  request: NativeDocumentRequest,
): Promise<NativeDocumentEventDetail> => {
  if (!supportsNativeDocumentActions()) {
    return Promise.reject(new Error("native-document-actions-unavailable"));
  }

  const bridge = getNativeAdsBridge();
  if (!bridge) {
    return Promise.reject(new Error("native-bridge-unavailable"));
  }

  const requestId = createRequestId();

  return new Promise<NativeDocumentEventDetail>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener(DOCUMENT_EVENT_NAME, onEvent as EventListener);
      window.clearTimeout(timeoutId);
    };

    const onEvent = (event: Event) => {
      const detail = parseDocumentEvent(event);
      if (!detail || detail.requestId !== requestId || detail.action !== action) return;
      cleanup();
      if (detail.phase === "success") {
        resolve(detail);
      } else {
        reject(new Error(detail.message || `${action}-failed`));
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${action}-timeout`));
    }, DOCUMENT_ACTION_TIMEOUT_MS);

    window.addEventListener(DOCUMENT_EVENT_NAME, onEvent as EventListener);

    try {
      const started = (() => {
        switch (action) {
          case "open":
            return bridge.openPdfDocument?.(requestId, request.title, request.fileName, request.html);
          case "share":
            return bridge.sharePdfDocument?.(
              requestId,
              request.title,
              request.fileName,
              request.html,
              request.chooserTitle ?? request.title,
            );
          case "email":
            return bridge.emailPdfDocument?.(
              requestId,
              request.to ?? "",
              request.subject ?? request.title,
              request.body ?? "",
              request.fileName,
              request.html,
              request.chooserTitle ?? request.title,
            );
          case "download":
            return bridge.downloadPdfDocument?.(requestId, request.fileName, request.html);
          default:
            return false;
        }
      })();

      if (started === false) {
        cleanup();
        reject(new Error(`${action}-not-started`));
      }
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error(`${action}-exception`));
    }
  });
};

const triggerBrowserDownload = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const runNativeBackupDownload = (
  fileName: string,
  json: string,
): Promise<NativeBackupEventDetail> => {
  if (!supportsNativeBackupActions()) {
    return Promise.reject(new Error("native-backup-actions-unavailable"));
  }

  const bridge = getNativeAdsBridge();
  const downloadBackupJson = bridge?.downloadBackupJson;
  if (typeof downloadBackupJson !== "function") {
    return Promise.reject(new Error("native-bridge-unavailable"));
  }

  const requestId = createRequestId();

  return new Promise<NativeBackupEventDetail>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener(BACKUP_EVENT_NAME, onEvent as EventListener);
      window.clearTimeout(timeoutId);
    };

    const onEvent = (event: Event) => {
      const detail = parseBackupEvent(event);
      if (!detail || detail.requestId !== requestId) return;
      cleanup();
      if (detail.phase === "success") {
        resolve(detail);
      } else {
        reject(new Error(detail.message || "backup-download-failed"));
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("backup-download-timeout"));
    }, BACKUP_ACTION_TIMEOUT_MS);

    window.addEventListener(BACKUP_EVENT_NAME, onEvent as EventListener);

    try {
      const started = downloadBackupJson(requestId, fileName, json);
      if (started === false) {
        cleanup();
        reject(new Error("backup-download-not-started"));
      }
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error("backup-download-exception"));
    }
  });
};

export const downloadBackupJsonFile = async (fileName: string, json: string): Promise<void> => {
  if (supportsNativeBackupActions()) {
    await runNativeBackupDownload(fileName, json);
    return;
  }

  triggerBrowserDownload(json, fileName, "application/json;charset=utf-8");
};


export const getBackupErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error ?? "").trim();

  switch (raw) {
    case "empty-json":
      return "Aucune donnée à exporter.";
    case "backup-download-cancelled":
      return "Export annulé.";
    case "backup-download-no-uri":
      return "Aucun emplacement de sauvegarde n’a été sélectionné.";
    case "backup-download-timeout":
      return "Le délai d’export a expiré.";
    case "backup-download-not-started":
    case "native-backup-actions-unavailable":
    case "native-bridge-unavailable":
      return "Le module de sauvegarde Android n’est pas disponible.";
    case "backup-download-exception":
    case "backup-download-failed":
      return "Erreur d’export Android.";
    default:
      return raw || "Erreur d’export Android.";
  }
};
