import fs from "fs";
import path from "path";

const LOCALES_DIR = "src/i18n/locales";
const REPORT_DIR = "i18n-report";
const LANGS = ["en", "fr"];

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

function deepMergeKeepTarget(target, patch) {
  // merge patch into target but DO NOT overwrite existing non-object values
  for (const k of Object.keys(patch || {})) {
    const pv = patch[k];
    const tv = target[k];

    if (isObject(pv)) {
      if (!isObject(tv)) target[k] = {};
      deepMergeKeepTarget(target[k], pv);
    } else {
      if (tv === undefined) target[k] = pv; // only set if missing
    }
  }
  return target;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main() {
  for (const lang of LANGS) {
    const localePath = path.join(LOCALES_DIR, `${lang}.json`);
    const missingPath = path.join(REPORT_DIR, `missing.${lang}.json`);

    const locale = loadJson(localePath);
    const missing = loadJson(missingPath);

    const merged = deepMergeKeepTarget(locale, missing);
    saveJson(localePath, merged);

    console.log(`✅ merged missing.${lang}.json -> ${localePath}`);
  }
}

main();