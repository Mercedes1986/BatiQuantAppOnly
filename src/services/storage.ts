import type { Project, UserSettings, HouseProject } from "../types";
import {
  canUsePersistentStorage,
  markNamespaceMigrated,
  migrateLegacyKey,
  readJson,
  writeJson,
} from "./persistentStorage";

const BRAND_PREFIX_NEW = "batiquant";
const BRAND_PREFIX_OLD = "baticalc";

const PROJECTS_KEY = `${BRAND_PREFIX_NEW}_projects`;
const HOUSE_PROJECTS_KEY = `${BRAND_PREFIX_NEW}_house_projects`;
const SETTINGS_KEY = `${BRAND_PREFIX_NEW}_settings`;

const PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_projects`;
const HOUSE_PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_house_projects`;
const SETTINGS_KEY_OLD = `${BRAND_PREFIX_OLD}_settings`;

const PROJECTS_EVENT = "batiquant:projects_changed";
const STORAGE_NAMESPACE = "projects";

type ProjectsEventDetail = {
  reason: "save" | "delete" | "settings" | "import";
  key: "projects" | "house_projects" | "settings";
};

const DEFAULT_SETTINGS: UserSettings = {
  currency: "€",
  taxRate: 20,
  isPro: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const sanitizeProjectList = (value: unknown): Project[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (project): project is Project =>
      isRecord(project) &&
      typeof project.id === "string" &&
      typeof project.name === "string" &&
      typeof project.date === "string" &&
      Array.isArray(project.items)
  );
};

const sanitizeHouseProjectList = (value: unknown): HouseProject[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (project): project is HouseProject =>
      isRecord(project) &&
      typeof project.id === "string" &&
      typeof project.name === "string" &&
      typeof project.date === "string" &&
      isRecord(project.params) &&
      isRecord(project.steps)
  );
};

const sanitizeSettings = (value: unknown): UserSettings => {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  const currency = typeof value.currency === "string" && value.currency.trim() ? value.currency : "€";
  const taxRate =
    typeof value.taxRate === "number" && Number.isFinite(value.taxRate) ? value.taxRate : DEFAULT_SETTINGS.taxRate;
  const isPro = typeof value.isPro === "boolean" ? value.isPro : DEFAULT_SETTINGS.isPro;

  return {
    currency,
    taxRate,
    isPro,
  };
};

function emitChanged(detail: ProjectsEventDetail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(PROJECTS_EVENT, { detail }));
  } catch {
    // ignore
  }
}

export const onProjectsChanged = (handler: (detail: ProjectsEventDetail) => void) => {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<ProjectsEventDetail>).detail);
  window.addEventListener(PROJECTS_EVENT, fn);
  return () => window.removeEventListener(PROJECTS_EVENT, fn);
};

let didMigrate = false;
function ensureMigratedOnce() {
  if (didMigrate) return;
  didMigrate = true;

  if (!canUsePersistentStorage()) return;

  migrateLegacyKey(PROJECTS_KEY, [PROJECTS_KEY_OLD]);
  migrateLegacyKey(HOUSE_PROJECTS_KEY, [HOUSE_PROJECTS_KEY_OLD]);
  migrateLegacyKey(SETTINGS_KEY, [SETTINGS_KEY_OLD]);
  markNamespaceMigrated(STORAGE_NAMESPACE);
}

const readProjects = (): Project[] => sanitizeProjectList(readJson<unknown>(PROJECTS_KEY, []));
const readHouseProjects = (): HouseProject[] => sanitizeHouseProjectList(readJson<unknown>(HOUSE_PROJECTS_KEY, []));
const readSettings = (): UserSettings => sanitizeSettings(readJson<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS));

export const getProjects = (): Project[] => {
  ensureMigratedOnce();
  return readProjects();
};

export const saveProject = (project: Project): void => {
  ensureMigratedOnce();
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  writeJson(PROJECTS_KEY, projects);
  emitChanged({ reason: "save", key: "projects" });
};

export const replaceProjects = (projects: Project[]): void => {
  ensureMigratedOnce();
  writeJson(PROJECTS_KEY, sanitizeProjectList(projects));
  emitChanged({ reason: "import", key: "projects" });
};

export const deleteProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getProjects().filter((p) => p.id !== id);
  writeJson(PROJECTS_KEY, projects);
  emitChanged({ reason: "delete", key: "projects" });
};

export const getHouseProjects = (): HouseProject[] => {
  ensureMigratedOnce();
  return readHouseProjects();
};

export const saveHouseProject = (project: HouseProject): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  writeJson(HOUSE_PROJECTS_KEY, projects);
  emitChanged({ reason: "save", key: "house_projects" });
};

export const replaceHouseProjects = (projects: HouseProject[]): void => {
  ensureMigratedOnce();
  writeJson(HOUSE_PROJECTS_KEY, sanitizeHouseProjectList(projects));
  emitChanged({ reason: "import", key: "house_projects" });
};

export const deleteHouseProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects().filter((p) => p.id !== id);
  writeJson(HOUSE_PROJECTS_KEY, projects);
  emitChanged({ reason: "delete", key: "house_projects" });
};

export const getSettings = (): UserSettings => {
  ensureMigratedOnce();
  return readSettings();
};

export const saveSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  writeJson(SETTINGS_KEY, sanitizeSettings(settings));
  emitChanged({ reason: "settings", key: "settings" });
};

export const replaceSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  writeJson(SETTINGS_KEY, sanitizeSettings(settings));
  emitChanged({ reason: "import", key: "settings" });
};

export const generateId = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
};
