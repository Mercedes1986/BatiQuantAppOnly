import type { Project, UserSettings, HouseProject } from "../types";

/**
 * Brand rename: BatiCalc -> BatiQuant
 * Strategy:
 * - New keys (batiquant_*)
 * - Backward compatible: reads old keys if new ones are empty
 * - One-time migration: if old exists and new missing => copy old -> new
 */

const BRAND_PREFIX_NEW = "batiquant";
const BRAND_PREFIX_OLD = "baticalc";

// New keys
const PROJECTS_KEY = `${BRAND_PREFIX_NEW}_projects`;
const HOUSE_PROJECTS_KEY = `${BRAND_PREFIX_NEW}_house_projects`;
const SETTINGS_KEY = `${BRAND_PREFIX_NEW}_settings`;

// Old keys (legacy)
const PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_projects`;
const HOUSE_PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_house_projects`;
const SETTINGS_KEY_OLD = `${BRAND_PREFIX_OLD}_settings`;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** Copy old key -> new key only if new is empty and old exists */
function migrateKey(oldKey: string, newKey: string) {
  try {
    const newVal = safeGet(newKey);
    if (newVal && newVal.trim().length > 0) return;

    const oldVal = safeGet(oldKey);
    if (!oldVal || oldVal.trim().length === 0) return;

    safeSet(newKey, oldVal);
    // Optionnel: tu peux supprimer l'ancienne clé après migration.
    // try { localStorage.removeItem(oldKey); } catch {}
  } catch {
    // ignore
  }
}

let didMigrate = false;
function ensureMigratedOnce() {
  if (didMigrate) return;
  didMigrate = true;

  migrateKey(PROJECTS_KEY_OLD, PROJECTS_KEY);
  migrateKey(HOUSE_PROJECTS_KEY_OLD, HOUSE_PROJECTS_KEY);
  migrateKey(SETTINGS_KEY_OLD, SETTINGS_KEY);
}

// --- Legacy Projects ---
export const getProjects = (): Project[] => {
  ensureMigratedOnce();
  return safeJsonParse<Project[]>(safeGet(PROJECTS_KEY), []);
};

export const saveProject = (project: Project): void => {
  ensureMigratedOnce();
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  safeSet(PROJECTS_KEY, JSON.stringify(projects));
};

export const deleteProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getProjects().filter((p) => p.id !== id);
  safeSet(PROJECTS_KEY, JSON.stringify(projects));
};

// --- HOUSE PROJECTS (Construction Site) ---
export const getHouseProjects = (): HouseProject[] => {
  ensureMigratedOnce();
  return safeJsonParse<HouseProject[]>(safeGet(HOUSE_PROJECTS_KEY), []);
};

export const saveHouseProject = (project: HouseProject): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  safeSet(HOUSE_PROJECTS_KEY, JSON.stringify(projects));
};

export const deleteHouseProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects().filter((p) => p.id !== id);
  safeSet(HOUSE_PROJECTS_KEY, JSON.stringify(projects));
};

// --- SETTINGS ---
const DEFAULT_SETTINGS: UserSettings = { currency: "€", taxRate: 20, isPro: false };

export const getSettings = (): UserSettings => {
  ensureMigratedOnce();
  return safeJsonParse<UserSettings>(safeGet(SETTINGS_KEY), DEFAULT_SETTINGS);
};

export const saveSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};
