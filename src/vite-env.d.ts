/// <reference types="vite/client" />

declare module "@johnfoderaro/apaw";

interface ImportMetaEnv {
  readonly VITE_BUILD_ID?: string;
  readonly VITE_BUILD_DATE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_AD_PLATFORM?: "none" | "web" | "mobile";
  readonly VITE_ENABLE_WEB_AD_PLACEHOLDERS?: string;
  readonly VITE_ENABLE_AD_DEBUG?: string;
  readonly VITE_ADMOB_APP_ID_ANDROID?: string;
  readonly VITE_ADMOB_APP_ID_IOS?: string;
  readonly VITE_ADMOB_BANNER_HOME?: string;
  readonly VITE_ADMOB_BANNER_RESULT?: string;
  readonly VITE_ADMOB_INTERSTITIAL_CALC_DONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
