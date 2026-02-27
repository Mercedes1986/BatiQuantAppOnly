import React, { useMemo, useState } from "react";
import { Lock, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onUnlock: () => void;
}

export const TutorialAuth: React.FC<Props> = ({ onUnlock }) => {
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Anti brute-force basique
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);

  const now = Date.now();
  const isLocked = now < lockedUntil;
  const remainingSec = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  // ⚠️ Toujours contournable côté client. Pour du vrai "Pro", il faut une auth serveur.
  const VALID_CODE = useMemo(
    () => String(import.meta.env.VITE_TUTORIAL_CODE || "PRO2024").toUpperCase().trim(),
    []
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const normalized = code.toUpperCase().trim();
    if (normalized === VALID_CODE) {
      localStorage.setItem("baticalc_tutorial_access", "true");
      onUnlock();
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    // Après 5 essais, lock 30s, puis 60s, puis 120s...
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