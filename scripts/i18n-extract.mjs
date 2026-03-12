import fs from "fs";
import path from "path";
import { globSync } from "glob";

const SRC_GLOB = "src/**/*.{ts,tsx,js,jsx}";
const LOCALES_DIR = "src/i18n/locales";
const LANGS = ["en", "fr"];
const OUT_DIR = "i18n-report";

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

function get(obj, keyPath) {
  return keyPath.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function set(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isObject(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Capture: t("key", { defaultValue: "..." })
// Works for t("x"), t('x'), i18next.t("x"), and basic template string without ${}
const RE_CALL = /\b(?:i18next\.)?t\(\s*(["'`])([^"'`]+)\1\s*(?:,\s*([^)]+))?\)/g;
const RE_DEFAULT = /defaultValue\s*:\s*(["'`])([\s\S]*?)\1/;

function extractFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const found = [];
  let m;

  while ((m = RE_CALL.exec(content))) {
    const key = (m[2] || "").trim();
    if (!key || key.includes("${")) continue;

    const arg2 = m[3] || "";
    let def = null;
    const dm = RE_DEFAULT.exec(arg2);
    if (dm) def = dm[2];

    found.push({ key, defaultValue: def, file: filePath });
  }

  return found;
}

function flatten(obj, prefix = "", out = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}

function main() {
  const files = globSync(SRC_GLOB, { nodir: true });

  // key -> { files:Set, defaultValues:Set }
  const map = new Map();

  for (const f of files) {
    const items = extractFromFile(f);
    for (const it of items) {
      if (!map.has(it.key)) map.set(it.key, { files: new Set(), defs: new Set() });
      map.get(it.key).files.add(it.file);
      if (it.defaultValue && String(it.defaultValue).trim() !== "") map.get(it.key).defs.add(it.defaultValue);
    }
  }

  const keysSorted = Array.from(map.keys()).sort();

  const locales = {};
  for (const lang of LANGS) locales[lang] = loadJson(path.join(LOCALES_DIR, `${lang}.json`));

  const missing = {};
  for (const lang of LANGS) missing[lang] = {};

  const report = [];

  for (const key of keysSorted) {
    const meta = map.get(key);
    const defCandidates = Array.from(meta.defs);

    // choose a defaultValue if present (first one)
    const bestDefault = defCandidates.length > 0 ? defCandidates[0] : "";

    for (const lang of LANGS) {
      const exists = get(locales[lang], key) !== undefined;
      if (!exists) {
        // fill with bestDefault instead of ""
        set(missing[lang], key, bestDefault);
        report.push({
          lang,
          key,
          defaultValue: bestDefault,
          files: Array.from(meta.files).slice(0, 20),
        });
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  saveJson(path.join(OUT_DIR, "missing.en.json"), missing.en);
  saveJson(path.join(OUT_DIR, "missing.fr.json"), missing.fr);

  fs.writeFileSync(
    path.join(OUT_DIR, "missing.report.txt"),
    report
      .map((r) => {
        const dv = r.defaultValue ? `  defaultValue: ${r.defaultValue}\n` : "";
        return `[${r.lang}] ${r.key}\n${dv}  - ${r.files.join("\n  - ")}\n`;
      })
      .join("\n"),
    "utf8"
  );

  console.log("✅ Done");
  console.log(`Keys found: ${keysSorted.length}`);
  console.log(`Missing EN: ${Object.keys(flatten(missing.en)).length}`);
  console.log(`Missing FR: ${Object.keys(flatten(missing.fr)).length}`);
  console.log(`Output: ${OUT_DIR}/missing.*`);
}

main();