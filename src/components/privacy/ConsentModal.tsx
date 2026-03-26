import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getConsent,
  hasUserChoice,
  openConsent,
  setConsentChoice,
  type ConsentChoice,
} from "../../services/consentService";
import { isNativeAdsBridgeAvailable } from "../../services/platformService";
import { getInAppPrivacyPolicyPath } from "../../services/privacyService";

const shouldUseWebConsent = () => !isNativeAdsBridgeAvailable();
const isSupportPath = (pathname: string) => pathname === "/app/help" || pathname === "/app/privacy";

export const ConsentModal: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState<boolean>(() => shouldUseWebConsent() && !hasUserChoice());
  const [dismissible, setDismissible] = useState<boolean>(() => shouldUseWebConsent() && hasUserChoice());
  const [choice, setChoice] = useState<ConsentChoice>(() => getConsent().choice);

  const privacyPath = useMemo(() => getInAppPrivacyPolicyPath(), []);

  useEffect(() => {
    if (!shouldUseWebConsent()) {
      setOpen(false);
      return;
    }

    const onOpen = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setDismissible(Boolean(detail?.dismissible) || hasUserChoice());
      setOpen(true);
    };

    const onUpdated = () => {
      const next = getConsent();
      setChoice(next.choice);
      setOpen(next.choice === "unknown" && !isSupportPath(location.pathname));
    };

    window.addEventListener("consent-open", onOpen as EventListener);
    window.addEventListener("consent-updated", onUpdated as EventListener);

    if (!hasUserChoice()) {
      setDismissible(false);
      openConsent({ dismissible: false });
    }

    return () => {
      window.removeEventListener("consent-open", onOpen as EventListener);
      window.removeEventListener("consent-updated", onUpdated as EventListener);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!shouldUseWebConsent()) return;
    if (hasUserChoice()) return;

    if (isSupportPath(location.pathname)) {
      setOpen(false);
      return;
    }

    setDismissible(false);
    setOpen(true);
  }, [location.pathname]);

  const submit = (nextChoice: Exclude<ConsentChoice, "unknown">) => {
    setConsentChoice(nextChoice);
    setChoice(nextChoice);
    setOpen(false);
    setDismissible(true);
  };

  const handleClose = () => {
    if (!dismissible) return;
    setOpen(false);
  };

  const handleOpenPrivacy = () => {
    setOpen(false);
    navigate(privacyPath);
  };

  if (!open || !shouldUseWebConsent()) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t("consent.title", { defaultValue: "Cookie consent" })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("consent.text", {
                  defaultValue:
                    "We use cookies to improve the app and measure audience.",
                })}
              </p>
            </div>
          </div>

          {dismissible ? (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label={t("common.close", { defaultValue: "Close" })}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {choice === "accepted"
            ? t("settings.ads.personalized_status", {
                defaultValue: "Personalized ads authorized.",
              })
            : t("settings.ads.limited_status", {
                defaultValue: "Limited ads only until you change your choice.",
              })}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => submit("refused")}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("consent.refuse", { defaultValue: "Refuse" })}
          </button>
          <button
            type="button"
            onClick={() => submit("accepted")}
            className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            {t("consent.accept", { defaultValue: "Accept" })}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {t("settings.support.privacy", { defaultValue: "Privacy policy" })}
          </span>
          <button
            type="button"
            onClick={handleOpenPrivacy}
            className="font-extrabold text-blue-600 transition-colors hover:text-blue-700"
          >
            {t("common.open", { defaultValue: "Open" })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
