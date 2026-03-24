import React, { useMemo, useState, useEffect } from "react";
import { Lock, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { canUsePersistentStorage, safeStorageGet, safeStorageSet } from "../../services/persistentStorage";

interface Props {
  onUnlock: () => void;
}

const ACCESS_KEY = "batiquant_tutorial_access";
const ACCESS_TS_KEY = "batiquant_tutorial_access_ts";
const ACCESS_TTL_DAYS = 7;

const canUseStorage = () => canUsePersistentStorage();

const hasValidAccessFlag = (): boolean => {
  if (!canUseStorage()) return false;

  try {
    const ok = safeStorageGet(ACCESS_KEY) === "true";
    if (!ok) return false;

    const ts = Number(safeStorageGet(ACCESS_TS_KEY) || "0");
    if (!ts) return true; // compat ancienne version sans TTL

    const maxAge = ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - ts <= maxAge;
  } catch {
    return false;
  }
};

const getConfiguredCode = (): string => {
  try {
    const raw = String((import.meta as any)?.env?.VITE_TUTORIAL_CODE || "").trim();
    return raw.toUpperCase().trim(); // ✅ pas de fallback en dur
  } catch {
    return "";
  }
};

export const TutorialAuth: React.FC<Props> = ({ onUnlock }) => {
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);

  const now = Date.now();
  const isLocked = now < lockedUntil;
  const remainingSec = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const VALID_CODE = useMemo(() => getConfiguredCode(), []);

  useEffect(() => {
    if (hasValidAccessFlag()) onUnlock();
  }, [onUnlock]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const normalized = code.toUpperCase().trim();

    if (!VALID_CODE) {
      setError(
        t("tutorial_auth.not_configured", {
          defaultValue: "Accès non configuré. Contactez le support.",
        })
      );
      return;
    }

    if (normalized === VALID_CODE) {
      try {
        if (canUseStorage()) {
          safeStorageSet(ACCESS_KEY, "true");
          safeStorageSet(ACCESS_TS_KEY, String(Date.now()));
        }
      } catch {
        // ignore
      }
      onUnlock();
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (nextAttempts >= 5) {
      const penalty = Math.min(120, 30 * Math.pow(2, Math.floor((nextAttempts - 5) / 3)));
      setLockedUntil(Date.now() + penalty * 1000);
    }

    setError(t("tutorial_auth.invalid_code", { defaultValue: "Code incorrect." }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t("tutorial_auth.title", { defaultValue: "Espace Tutoriels" })}
          </h1>
          <p className="text-slate-400 text-sm">
            {t("tutorial_auth.subtitle", {
              defaultValue: "Accédez aux guides experts et méthodes de calcul détaillées.",
            })}
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              {t("tutorial_auth.access_code", { defaultValue: "Code d'accès" })}
            </label>

            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder={t("tutorial_auth.placeholder", { defaultValue: "Entrez votre code..." })}
              disabled={isLocked}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-60"
            />

            {error && (
              <div className="flex items-center mt-3 text-red-500 text-sm">
                <AlertTriangle size={16} className="mr-2" />
                {error}
              </div>
            )}

            {isLocked && (
              <div className="mt-3 text-amber-700 text-sm">
                {t("tutorial_auth.locked", {
                  defaultValue: "Trop d’essais. Réessayez dans {{sec}}s.",
                  sec: remainingSec,
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLocked}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center active:scale-[0.98] disabled:opacity-60"
          >
            {t("tutorial_auth.unlock", { defaultValue: "Déverrouiller" })}{" "}
            <ArrowRight size={20} className="ml-2" />
          </button>

          <div className="mt-6 flex items-start p-4 bg-blue-50 rounded-xl border border-blue-100">
            <ShieldCheck size={20} className="text-blue-600 mr-3 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              {t("tutorial_auth.notice", {
                defaultValue:
                  "Cet espace est réservé. Si vous n’avez pas de code, utilisez l’accès public de l’application ou contactez le support.",
              })}
            </p>
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            {t("tutorial_auth.note", {
              defaultValue:
                "Note: ce verrou est côté navigateur (demo). Pour un vrai “Pro”, il faut une authentification serveur.",
            })}
          </div>
        </form>
      </div>
    </div>
  );
};