export const I18N_KEYS = {
  app: {
    name: "app.name",
    nameSuffix: "app.name_suffix",
  },

  common: {
    appName: "common.appName",
    language: "common.language",
    save: "common.save",
    cancel: "common.cancel",
    close: "common.close",
    continue: "common.continue",
    back: "common.back",
    yes: "common.yes",
    no: "common.no",
    loading: "common.loading",
    error: "common.error",
    notAvailable: "common.notAvailable",
    delete: "common.delete",
    edit: "common.edit",
  },

  nav: {
    menu: "nav.menu",
    calc: "nav.calc",
    site: "nav.site",
    projects: "nav.projects",
    materials: "nav.materials",
    settings: "nav.settings",
  },

  settings: {
    title: "settings.title",
    languageTitle: "settings.languageTitle",
    languageHelp: "settings.languageHelp",
    privacyTitle: "settings.privacy.title",
    privacyManage: "settings.privacy.manage",
    privacyReset: "settings.privacy.reset",
  },

  language: {
    fr: "language.fr",
    en: "language.en",
  },

  cookie: {
    title: "cookie.title",
    text: "cookie.text",
    accept: "cookie.accept",
    refuse: "cookie.refuse",
    manage: "cookie.manage",
  },

  ads: {
    label: "ads.label",
    placeholderTitle: "ads.placeholder_title",
    placeholderText: "ads.placeholder_text",
  },
} as const;

export type I18nKey =
  | (typeof I18N_KEYS.app)[keyof typeof I18N_KEYS.app]
  | (typeof I18N_KEYS.common)[keyof typeof I18N_KEYS.common]
  | (typeof I18N_KEYS.nav)[keyof typeof I18N_KEYS.nav]
  | (typeof I18N_KEYS.settings)[keyof typeof I18N_KEYS.settings]
  | (typeof I18N_KEYS.language)[keyof typeof I18N_KEYS.language]
  | (typeof I18N_KEYS.cookie)[keyof typeof I18N_KEYS.cookie]
  | (typeof I18N_KEYS.ads)[keyof typeof I18N_KEYS.ads];

export const tKey = <T extends I18nKey>(k: T) => k;
