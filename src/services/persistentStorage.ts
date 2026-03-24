export const APP_STORAGE_SCHEMA_VERSION = 2;
export const APP_BUILD_KEY = "bq_build_id";
export const STORAGE_META_KEY = "batiquant_storage_meta";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

export interface StorageMeta {
  schemaVersion: number;
  initializedAt: number;
  lastBootAt: number;
  lastBuildId: string;
  namespaces: Record<string, number>;
}

export interface StorageBootstrapResult {
  storageAvailable: boolean;
  buildChanged: boolean;
  previousBuildId: string | null;
}

const DEFAULT_STORAGE_META: StorageMeta = {
  schemaVersion: APP_STORAGE_SCHEMA_VERSION,
  initializedAt: 0,
  lastBootAt: 0,
  lastBuildId: "",
  namespaces: {},
};

let didBootstrap = false;

const sanitizeMeta = (value: unknown): StorageMeta => {
  const input = value && typeof value === "object" ? (value as Partial<StorageMeta>) : {};
  const namespaces =
    input.namespaces && typeof input.namespaces === "object"
      ? Object.fromEntries(
          Object.entries(input.namespaces).filter(
            ([key, ts]) => typeof key === "string" && typeof ts === "number" && Number.isFinite(ts)
          )
        )
      : {};

  return {
    schemaVersion:
      typeof input.schemaVersion === "number" && Number.isFinite(input.schemaVersion)
        ? input.schemaVersion
        : APP_STORAGE_SCHEMA_VERSION,
    initializedAt:
      typeof input.initializedAt === "number" && Number.isFinite(input.initializedAt)
        ? input.initializedAt
        : 0,
    lastBootAt:
      typeof input.lastBootAt === "number" && Number.isFinite(input.lastBootAt)
        ? input.lastBootAt
        : 0,
    lastBuildId: typeof input.lastBuildId === "string" ? input.lastBuildId : "",
    namespaces,
  };
};

export const canUsePersistentStorage = (): boolean => {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
};

export const safeStorageGet = (key: string): string | null => {
  if (!canUsePersistentStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeStorageSet = (key: string, value: string): boolean => {
  if (!canUsePersistentStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeStorageRemove = (key: string): boolean => {
  if (!canUsePersistentStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const readJson = <T>(key: string, fallback: T): T => {
  const raw = safeStorageGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = <T>(key: string, value: T): boolean => {
  try {
    return safeStorageSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
};

export const migrateLegacyKey = (
  newKey: string,
  legacyKeys: string[],
  options?: {
    removeLegacy?: boolean;
    validate?: (raw: string) => boolean;
  }
): string | null => {
  const current = safeStorageGet(newKey);
  if (current != null && current.trim() !== "") return newKey;

  for (const legacyKey of legacyKeys) {
    const legacyValue = safeStorageGet(legacyKey);
    if (legacyValue == null || legacyValue.trim() === "") continue;

    if (options?.validate && !options.validate(legacyValue)) continue;

    const written = safeStorageSet(newKey, legacyValue);
    if (!written) return null;

    if (options?.removeLegacy) {
      safeStorageRemove(legacyKey);
    }

    return legacyKey;
  }

  return null;
};

export const getStorageMeta = (): StorageMeta =>
  sanitizeMeta(readJson<StorageMeta>(STORAGE_META_KEY, DEFAULT_STORAGE_META));

export const writeStorageMeta = (patch: Partial<StorageMeta>): StorageMeta => {
  const current = getStorageMeta();
  const next = sanitizeMeta({
    ...current,
    ...patch,
    namespaces: {
      ...current.namespaces,
      ...(patch.namespaces || {}),
    },
  });
  writeJson(STORAGE_META_KEY, next);
  return next;
};

export const markNamespaceMigrated = (namespace: string): void => {
  if (!namespace) return;
  const current = getStorageMeta();
  writeStorageMeta({
    namespaces: {
      ...current.namespaces,
      [namespace]: Date.now(),
    },
  });
};

export const getStoredBuildId = (): string => safeStorageGet(APP_BUILD_KEY) || "";

export const setStoredBuildId = (buildId: string): void => {
  if (!buildId) return;
  safeStorageSet(APP_BUILD_KEY, buildId);
};

export const clearRuntimeCaches = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // ignore cache cleanup failures
    }
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // ignore service worker cleanup failures
    }
  }
};

export const bootstrapPersistentStorage = async (
  buildId: string
): Promise<StorageBootstrapResult> => {
  const storageAvailable = canUsePersistentStorage();
  const previousBuildId = storageAvailable ? getStoredBuildId() || null : null;
  const buildChanged = !!(storageAvailable && previousBuildId && previousBuildId !== buildId);

  if (didBootstrap) {
    return { storageAvailable, buildChanged, previousBuildId };
  }
  didBootstrap = true;

  if (!storageAvailable) {
    return { storageAvailable: false, buildChanged: false, previousBuildId: null };
  }

  if (buildChanged) {
    await clearRuntimeCaches();
  }

  const now = Date.now();
  const currentMeta = getStorageMeta();
  writeStorageMeta({
    schemaVersion: APP_STORAGE_SCHEMA_VERSION,
    initializedAt: currentMeta.initializedAt || now,
    lastBootAt: now,
    lastBuildId: buildId,
  });

  setStoredBuildId(buildId);

  return { storageAvailable: true, buildChanged, previousBuildId };
};

export const getPreferredLanguage = (): string | null => {
  const raw = safeStorageGet(LANGUAGE_STORAGE_KEY);
  return raw && raw.trim() ? raw : null;
};

export const setPreferredLanguage = (language: string): boolean => {
  const normalized = String(language || "").trim();
  if (!normalized) return false;
  return safeStorageSet(LANGUAGE_STORAGE_KEY, normalized);
};
