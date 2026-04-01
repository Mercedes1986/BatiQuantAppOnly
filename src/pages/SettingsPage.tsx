import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeInfo,
  Building2,
  ChevronRight,
  Coins,
  Download,
  Globe,
  HardDrive,
  HelpCircle,
  Languages,
  RotateCcw,
  Shield,
  ShieldCheck,
  User,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CompanyProfileForm } from "@/components/documents/CompanyProfileForm";
import { setPreferredLanguage } from "@/services/persistentStorage";
import {
  getInAppHelpPath,
  getInAppPrivacyPolicyPath,
  getPrivacyState,
  openPrivacyOptions,
  resetPrivacyChoices,
} from "@/services/privacyService";
import { exportAppData, importAppData } from "@/services/materialsService";
import {
  getAdFreeEventName,
  getPurchaseRuntimeState,
  refreshPurchaseState,
  restoreAdFreePurchases,
  startRemoveAdsPurchase,
} from "@/services/purchaseService";
import { getHouseProjects, getSettings, saveSettings } from "@/services/storage";
import { FREE_HOUSE_PROJECT_LIMIT } from "@/services/premiumService";

type SettingsTab = "app" | "company";
type Currency = "EUR" | "USD" | "CAD" | "CHF";

const getAppVersion = () => {
  try {
    const version = String((import.meta as any)?.env?.VITE_APP_VERSION || "").trim();
    if (version) return `BatiQuant v${version}`;
    return (import.meta as any)?.env?.DEV ? "BatiQuant (dev)" : "BatiQuant";
  } catch {
    return "BatiQuant";
  }
};

const currencyCodeToStoredValue = (currency: Currency): string => {
  switch (currency) {
    case "USD":
      return "USD";
    case "CAD":
      return "CAD";
    case "CHF":
      return "CHF";
    case "EUR":
    default:
      return "EUR";
  }
};

const storedValueToCurrencyCode = (stored: string): Currency => {
  const normalized = String(stored || "").trim().toUpperCase();
  if (normalized === "USD" || normalized === "$USD") return "USD";
  if (normalized === "CAD" || normalized === "$CAD") return "CAD";
  if (normalized === "CHF") return "CHF";
  if (normalized === "€" || normalized === "EUR") return "EUR";
  if (normalized === "$") return "USD";
  return "EUR";
};

const currencySelectLabel = (currency: Currency): string => {
  switch (currency) {
    case "USD":
      return "USD ($)";
    case "CAD":
      return "CAD ($)";
    case "CHF":
      return "CHF";
    case "EUR":
    default:
      return "EUR (€)";
  }
};


export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("app");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [isImporting, setIsImporting] = useState(false);
  const [privacyVersion, setPrivacyVersion] = useState(0);
  const [purchaseBusy, setPurchaseBusy] = useState<null | "buy" | "restore">(null);
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const versionLabel = useMemo(() => getAppVersion(), []);
  const privacyPolicyPath = useMemo(() => getInAppPrivacyPolicyPath(), []);
  const helpPath = useMemo(() => getInAppHelpPath(), []);
  const privacyState = useMemo(() => getPrivacyState(), [privacyVersion]);
  const purchaseState = useMemo(() => getPurchaseRuntimeState(), [privacyVersion]);
  const hasNoAds = purchaseState.entitled;
  const houseProjectsCount = useMemo(() => getHouseProjects().length, [privacyVersion]);

  useEffect(() => {
    try {
      const settings = getSettings();
      setCurrency(storedValueToCurrencyCode(settings.currency || "EUR"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const refresh = () => setPrivacyVersion((current) => current + 1);
    const adFreeEvent = getAdFreeEventName();

    window.addEventListener("consent-updated", refresh);
    window.addEventListener("batiquant-native-privacy", refresh as EventListener);
    window.addEventListener("batiquant-native-purchase", refresh as EventListener);
    window.addEventListener(adFreeEvent, refresh as EventListener);

    return () => {
      window.removeEventListener("consent-updated", refresh);
      window.removeEventListener("batiquant-native-privacy", refresh as EventListener);
      window.removeEventListener("batiquant-native-purchase", refresh as EventListener);
      window.removeEventListener(adFreeEvent, refresh as EventListener);
    };
  }, []);

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    try {
      const json = exportAppData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `BatiQuant_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(
        t("settings.export_error", {
          defaultValue: "Erreur lors de l’export. Réessayez.",
        })
      );
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(
        t("settings.file_too_big", {
          defaultValue: "Fichier trop volumineux (max 5 Mo).",
        })
      );
      resetFileInput();
      return;
    }

    const ok = confirm(
      t("settings.import_confirm", {
        defaultValue:
          "Attention : L'importation remplacera vos données actuelles. Voulez-vous continuer ?",
      })
    );
    if (!ok) {
      resetFileInput();
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsImporting(false);
      resetFileInput();
      alert(
        t("settings.file_read_error", {
          defaultValue: "Erreur de lecture du fichier.",
        })
      );
    };

    reader.onload = (loadEvent) => {
      try {
        const content = loadEvent.target?.result;
        if (!content || typeof content !== "string") {
          alert(
            t("settings.invalid_backup", {
              defaultValue: "Erreur: Fichier de sauvegarde invalide.",
            })
          );
          return;
        }

        const success = importAppData(content, "replace");
        if (success) {
          alert(
            t("settings.restore_ok", {
              defaultValue: "Données restaurées avec succès !",
            })
          );
          window.location.reload();
        } else {
          alert(
            t("settings.invalid_backup", {
              defaultValue: "Erreur: Fichier de sauvegarde invalide.",
            })
          );
        }
      } catch (error) {
        console.error(error);
        alert(
          t("settings.invalid_backup", {
            defaultValue: "Erreur: Fichier de sauvegarde invalide.",
          })
        );
      } finally {
        setIsImporting(false);
        resetFileInput();
      }
    };

    reader.readAsText(file);
  };

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      setPreferredLanguage(lng);
    } catch (error) {
      console.error(error);
    }
  };

  const onCurrencyChange = (nextCurrency: Currency) => {
    setCurrency(nextCurrency);
    try {
      const current = getSettings();
      saveSettings({
        ...current,
        currency: currencyCodeToStoredValue(nextCurrency),
      });
    } catch {
      // ignore
    }
  };

  const handleOpenPrivacyOptions = async () => {
    try {
      await openPrivacyOptions();
      setPrivacyVersion((current) => current + 1);
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetPrivacy = () => {
    const confirmed = confirm(
      t("settings.ads.reset_confirm", {
        defaultValue:
          "Réinitialiser vos choix publicitaires et de confidentialité ?",
      })
    );
    if (!confirmed) return;

    resetPrivacyChoices();
    setPrivacyVersion((current) => current + 1);
  };

  const refreshPurchaseUi = () => {
    setPrivacyVersion((current) => current + 1);
  };

  const handleBuyRemoveAds = async () => {
    setPurchaseBusy("buy");
    setPurchaseMessage("");

    try {
      const state = await startRemoveAdsPurchase();
      setPurchaseMessage(
        state.entitled
          ? t("settings.pro.purchase_success", {
              defaultValue: "BatiQuant Pro activé • Les publicités sont désactivées et les chantiers illimités sont débloqués.",
            })
          : t("settings.pro.purchase_pending", {
              defaultValue: "BatiQuant Pro est en attente de validation par Google Play.",
            }),
      );
      refreshPurchaseUi();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "purchase-failed";
      setPurchaseMessage(
        rawMessage === "purchase-cancelled"
          ? t("settings.pro.purchase_cancelled", {
              defaultValue: "Achat annulé.",
            })
          : t("settings.pro.purchase_error", {
              defaultValue: "Impossible d’ouvrir l’achat BatiQuant Pro pour le moment.",
            }),
      );
      refreshPurchaseUi();
    } finally {
      setPurchaseBusy(null);
    }
  };

  const handleRestorePurchases = async () => {
    setPurchaseBusy("restore");
    setPurchaseMessage("");

    try {
      const state = await restoreAdFreePurchases();
      setPurchaseMessage(
        state.entitled
          ? t("settings.pro.restore_success", {
              defaultValue: "BatiQuant Pro restauré • Les publicités sont désactivées et les chantiers illimités sont débloqués.",
            })
          : t("settings.pro.restore_empty", {
              defaultValue: "Aucun achat BatiQuant Pro actif n’a été trouvé sur ce compte Google Play.",
            }),
      );
      refreshPurchaseUi();
    } catch {
      setPurchaseMessage(
        t("settings.pro.restore_error", {
          defaultValue: "Impossible de restaurer les achats pour le moment.",
        }),
      );
      refreshPurchaseUi();
    } finally {
      setPurchaseBusy(null);
    }
  };

  const tabButton = (tab: SettingsTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={[
        "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-extrabold transition-colors",
        activeTab === tab
          ? "bg-white text-slate-900 shadow"
          : "text-slate-700 hover:bg-white/70",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );

  const rowClass =
    "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-white/70";

  return (
    <div className="app-shell app-shell--settings min-h-full bg-transparent p-4 safe-bottom-offset">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">
                {t("settings.title", { defaultValue: "Settings" })}
              </h1>
            </div>
          </div>

          <div className="mx-auto mt-4 w-fit max-w-full">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/80 p-1.5 shadow-sm">
              {tabButton(
                "app",
                t("settings.tabs.app", { defaultValue: "Application" }),
                <Globe size={16} />
              )}
              {tabButton(
                "company",
                t("settings.tabs.company", {
                  defaultValue: "Entreprise & Facturation",
                }),
                <Building2 size={16} />
              )}
            </div>
          </div>
        </section>

        {activeTab === "company" ? (
          <div className="rounded-[28px] border border-slate-200/80 bg-white/72 p-1 shadow-sm backdrop-blur-md md:p-2">
            <CompanyProfileForm />
          </div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                    <User size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-slate-800">
                      {t("settings.pro.title", { defaultValue: "BatiQuant Pro" })}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {hasNoAds
                        ? t("settings.pro.ad_free_active", {
                            defaultValue: "BatiQuant Pro actif • Publicités désactivées et chantiers illimités.",
                          })
                        : purchaseState.billingReady && purchaseState.productReady
                        ? t("settings.pro.ad_free_pending", {
                            defaultValue: "Passez à BatiQuant Pro pour supprimer les pubs et débloquer les chantiers illimités.",
                          })
                        : t("settings.pro.billing_unavailable", {
                            defaultValue: "BatiQuant Pro n’est pas encore disponible sur cet appareil ou cette build.",
                          })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-sm font-extrabold text-slate-700">
                    {t("settings.pro.status_title", { defaultValue: "État Google Play" })}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {hasNoAds
                      ? t("settings.pro.status_active", {
                          defaultValue: "BatiQuant Pro est actif sur cet appareil.",
                        })
                      : purchaseState.billingReady && purchaseState.productReady
                      ? t("settings.pro.status_ready", {
                          defaultValue: "Google Play est prêt. Vous pouvez activer BatiQuant Pro maintenant.",
                        })
                      : purchaseState.billingReady
                      ? t("settings.pro.status_product_missing", {
                          defaultValue: "Google Play est prêt, mais le produit Pro n’est pas encore trouvé.",
                        })
                      : t("settings.pro.status_connecting", {
                          defaultValue: "Connexion Google Play en attente ou indisponible.",
                        })}
                  </p>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                      {t("settings.pro.plan_title", { defaultValue: "Current plan" })}
                    </div>
                    <div className="mt-2 text-sm font-extrabold text-slate-800">
                      {hasNoAds
                        ? t("settings.pro.plan_pro", { defaultValue: "BatiQuant Pro" })
                        : t("settings.pro.plan_free", { defaultValue: "Free version with ads" })}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasNoAds
                        ? t("settings.pro.plan_sites_pro", { defaultValue: "Unlimited site tracking enabled." })
                        : t("settings.pro.plan_sites_free", { defaultValue: "1 free site included before upgrade." })}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-600">
                      {hasNoAds
                        ? t("settings.pro.plan_usage_unlimited", { defaultValue: "Saved sites: {{count}} • unlimited", count: houseProjectsCount })
                        : t("settings.pro.plan_usage_free", { defaultValue: "Saved sites: {{count}} / {{limit}}", count: houseProjectsCount, limit: FREE_HOUSE_PROJECT_LIMIT })}
                    </p>
                  </div>
                  {purchaseState.productId ? (
                    <p className="mt-2 text-xs text-slate-400">
                      {t("settings.pro.product_id", { defaultValue: "Product ID" })}: {purchaseState.productId}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-sm font-extrabold text-slate-700">
                    {t("settings.pro.actions_title", { defaultValue: "Upgrade & restore" })}
                  </div>
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs font-semibold text-emerald-900">
                    <div>• {t("settings.pro.benefit_no_ads", { defaultValue: "Remove all ads" })}</div>
                    <div className="mt-1">• {t("settings.pro.benefit_unlimited_sites", { defaultValue: "Unlock unlimited site tracking" })}</div>
                    <div className="mt-1">• {t("settings.pro.benefit_restore", { defaultValue: "Restore purchases on a new device" })}</div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {!hasNoAds ? (
                      <button
                        type="button"
                        onClick={handleBuyRemoveAds}
                        disabled={purchaseBusy !== null || !purchaseState.billingReady || !purchaseState.productReady}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {purchaseBusy === "buy"
                          ? t("settings.pro.buy_loading", { defaultValue: "Ouverture de Google Play..." })
                          : t("settings.pro.buy_button", { defaultValue: "Passer à BatiQuant Pro" })}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRestorePurchases}
                      disabled={purchaseBusy !== null || !purchaseState.billingReady}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {purchaseBusy === "restore"
                        ? t("settings.pro.restore_loading", { defaultValue: "Restauration en cours..." })
                        : t("settings.pro.restore_button", { defaultValue: "Restaurer mes achats" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPurchaseMessage("");
                        void refreshPurchaseState().then(refreshPurchaseUi).catch(refreshPurchaseUi);
                      }}
                      disabled={purchaseBusy !== null}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("settings.pro.refresh_button", { defaultValue: "Actualiser l’état Google Play" })}
                    </button>
                  </div>
                </div>
              </div>

              {purchaseMessage ? (
                <div className="px-5 pb-5">
                  <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                    {purchaseMessage}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md">
              <h3 className="flex items-center px-5 pt-5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                <HardDrive size={12} className="mr-2" />
                {t("settings.data.title", {
                  defaultValue: "Données & Sauvegarde",
                })}
              </h3>

              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/70 p-5 transition-colors hover:border-blue-200 hover:bg-blue-50/70"
                >
                  <Download
                    size={24}
                    className="mb-2 text-blue-600 transition-transform group-hover:scale-110"
                  />
                  <span className="text-sm font-extrabold text-slate-700">
                    {t("settings.data.backup", { defaultValue: "Sauvegarder" })}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t("settings.data.export_json", {
                      defaultValue: "Exporter JSON",
                    })}
                  </span>
                </button>

                <label
                  className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/70 p-5 transition-colors ${
                    isImporting
                      ? "pointer-events-none opacity-60"
                      : "hover:border-emerald-200 hover:bg-emerald-50/70"
                  }`}
                  title={
                    isImporting
                      ? t("settings.data.importing", {
                          defaultValue: "Import en cours…",
                        })
                      : t("settings.data.import_title", {
                          defaultValue: "Importer une sauvegarde",
                        })
                  }
                >
                  <Upload
                    size={24}
                    className="mb-2 text-emerald-600 transition-transform group-hover:scale-110"
                  />
                  <span className="text-sm font-extrabold text-slate-700">
                    {isImporting
                      ? t("settings.data.importing_short", {
                          defaultValue: "Import...",
                        })
                      : t("settings.data.restore", { defaultValue: "Restaurer" })}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t("settings.data.import_json", {
                      defaultValue: "Importer JSON",
                    })}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/json,.json"
                    onChange={handleImport}
                  />
                </label>
              </div>

              <div className="px-5 pb-5">
                <div className="flex items-start rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                  <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                  <p>
                    {t("settings.data.warning", {
                      defaultValue:
                        "Important : Vos données sont stockées dans le navigateur. Pensez à faire une sauvegarde régulière.",
                    })}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md">
              <h3 className="px-5 pt-5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {t("settings.app.title", { defaultValue: "Application" })}
              </h3>

              <div className="divide-y divide-slate-100">
                <div className={rowClass}>
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Coins size={16} className="text-slate-400" />
                    {t("settings.app.currency", { defaultValue: "Currency" })}
                  </span>
                  <select
                    value={currency}
                    onChange={(event) => onCurrencyChange(event.target.value as Currency)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:ring-0"
                  >
                    {(["EUR", "USD", "CAD", "CHF"] as Currency[]).map((entry) => (
                      <option key={entry} value={entry}>
                        {currencySelectLabel(entry)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={rowClass}>
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Languages size={16} className="text-slate-400" />
                    {t("settings.app.language", { defaultValue: "Language" })}
                  </span>

                  <select
                    value={(i18n.language || "fr").split("-")[0]}
                    onChange={(event) => changeLanguage(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:ring-0"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800">
                      {t("settings.ads.title", {
                        defaultValue: "Publicité & confidentialité",
                      })}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {hasNoAds
                        ? t("settings.ads.ad_free_status", {
                            defaultValue: "La licence Pro désactive toutes les publicités dans l’application.",
                          })
                        : privacyState.canRequestAds
                        ? t("settings.ads.enabled_status", {
                            defaultValue: "Les demandes publicitaires sont autorisées.",
                          })
                        : t("settings.ads.disabled_status", {
                            defaultValue:
                              "Les demandes publicitaires sont actuellement bloquées.",
                          })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                    <BadgeInfo size={16} className="text-slate-400" />
                    {t("settings.ads.mode", { defaultValue: "Mode actuel" })}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {hasNoAds
                      ? t("settings.ads.ad_free_mode", {
                          defaultValue: "Mode sans publicité actif.",
                        })
                      : privacyState.adsMode === "personalized"
                      ? t("settings.ads.personalized_status", {
                          defaultValue: "Annonces personnalisées autorisées.",
                        })
                      : t("settings.ads.limited_status", {
                          defaultValue:
                            "Annonces limitées ou non personnalisées.",
                        })}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {privacyState.privacyOptionsRequired
                      ? t("settings.ads.privacy_required", {
                          defaultValue:
                            "Une entrée de gestion des choix doit rester accessible.",
                        })
                      : t("settings.ads.privacy_optional", {
                          defaultValue:
                            "Aucun formulaire complémentaire n’est exigé dans cette session.",
                        })}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                    <Shield size={16} className="text-slate-400" />
                    {t("settings.ads.actions", { defaultValue: "Actions" })}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {!hasNoAds ? (
                      <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                        {t("settings.ads.remove_ads_hint", {
                          defaultValue: "Les publicités se désactivent automatiquement après l’achat ou la restauration d’une licence Pro.",
                        })}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleOpenPrivacyOptions}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-blue-700"
                    >
                      {t("settings.ads.manage_choices", {
                        defaultValue: "Gérer mes choix publicitaires",
                      })}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPrivacy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw size={16} />
                      {t("settings.ads.reset_choices", {
                        defaultValue: "Réinitialiser mes choix",
                      })}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md">
              <div className="divide-y divide-slate-100">
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => navigate(helpPath)}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {t("settings.support.help", { defaultValue: "Aide & FAQ" })}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => navigate(privacyPolicyPath)}
                >
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {t("settings.support.privacy", {
                        defaultValue: "Politique de confidentialité",
                      })}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              </div>
            </section>

            <div className="pt-4 text-center">
              <p className="text-xs text-slate-400">{versionLabel}</p>
              <p className="mt-2 text-[10px] text-slate-300">
                {t("settings.footer", {
                  defaultValue:
                    "Vos préférences et projets restent stockés sur votre appareil.",
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
