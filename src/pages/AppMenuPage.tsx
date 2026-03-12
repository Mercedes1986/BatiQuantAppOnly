import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ArrowLeft,
  ShieldCheck,
  HardHat,
  FolderOpen,
  Boxes,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type SectionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  accentClass: string;
  iconWrapClass: string;
  compact?: boolean;
};

const MainSectionCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[26px] border border-white/70 bg-white/88 p-4 text-left shadow-[0_12px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.14)] ${card.accentClass}`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${card.iconWrapClass}`}>
          {card.icon}
        </div>
        <ChevronRight className="mt-1 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-600" size={18} />
      </div>

      <div className="relative z-10 mt-6">
        <h3 className="text-[17px] font-extrabold leading-tight text-slate-900">{card.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-slate-600">{card.desc}</p>
      </div>

      <div className="relative z-10 mt-4 inline-flex items-center text-sm font-extrabold text-blue-700">
        {t("menu.open", { defaultValue: "Ouvrir" })}
        <ChevronRight size={16} className="ml-0.5" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-80" />
    </button>
  );
};

const MiniSectionCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/86 px-4 py-3 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.iconWrapClass}`}>
        {card.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-slate-900">{card.title}</div>
        <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{card.desc}</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-400 group-hover:text-slate-700" />
    </button>
  );
};

export const AppMenuPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mainCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.quicktools.title", { defaultValue: "Calculs rapides" }),
        desc: t("menu.cards.quicktools.desc", {
          defaultValue: "Conversions, pentes, conditionnements et contrôles express.",
        }),
        path: "/app/quick-tools",
        icon: <Sparkles size={19} />,
        accentClass: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_58%)]",
        iconWrapClass: "bg-blue-100 text-blue-700",
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Chantier" }),
        desc: t("menu.cards.house.desc", {
          defaultValue: "Créer un chantier et enregistrer les résultats étape par étape.",
        }),
        path: "/app/house",
        icon: <HardHat size={19} />,
        accentClass: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_58%)]",
        iconWrapClass: "bg-amber-100 text-amber-700",
      },
      {
        title: t("menu.cards.projects.title", { defaultValue: "Projets" }),
        desc: t("menu.cards.projects.desc", {
          defaultValue: "Retrouver les calculs sauvegardés, matériaux et coûts.",
        }),
        path: "/app/projects",
        icon: <FolderOpen size={19} />,
        accentClass: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_58%)]",
        iconWrapClass: "bg-indigo-100 text-indigo-700",
      },
      {
        title: t("menu.cards.materials.title", { defaultValue: "Matériaux & Prix" }),
        desc: t("menu.cards.materials.desc", {
          defaultValue: "Prix, matériaux perso, main d’œuvre et données.",
        }),
        path: "/app/materials",
        icon: <Boxes size={19} />,
        accentClass: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_58%)]",
        iconWrapClass: "bg-emerald-100 text-emerald-700",
      },
    ],
    [t]
  );

  const secondaryCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.settings.title", { defaultValue: "Réglages" }),
        desc: t("menu.cards.settings.desc", {
          defaultValue: "Options, préférences et affichage.",
        }),
        path: "/app/settings",
        icon: <SettingsIcon size={18} />,
        accentClass: "",
        iconWrapClass: "bg-violet-100 text-violet-700",
        compact: true,
      },
      {
        title: t("menu.cards.backup.title", { defaultValue: "Sauvegarde JSON" }),
        desc: t("menu.cards.backup.desc", {
          defaultValue: "Exporter ou importer vos données.",
        }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} />,
        accentClass: "",
        iconWrapClass: "bg-slate-100 text-slate-700",
        compact: true,
      },
    ],
    [t]
  );

  return (
    <div className="app-shell app-shell--menu pb-24">
      <div className="mx-auto w-full max-w-md px-4 pt-4 sm:max-w-xl lg:max-w-3xl">
        <div className="glass-panel sticky top-3 z-20 rounded-[28px] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]">
                <LayoutGrid size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-extrabold leading-tight text-slate-950">
                  {t("menu.title", { defaultValue: "Menu de l'application" })}
                </h1>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {t("menu.subtitle", { defaultValue: "Accès rapide aux sections principales" })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-slate-100/90 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 sm:inline-flex"
              title={t("menu.back_dashboard_title", { defaultValue: "Retour au tableau de bord" })}
            >
              <ArrowLeft size={16} />
              <span>{t("menu.back_dashboard", { defaultValue: "Tableau de bord" })}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mainCards.map((card) => (
            <MainSectionCard key={card.path} card={card} onClick={() => navigate(card.path)} />
          ))}
        </div>

        <div className="mt-4 rounded-[28px] border border-white/70 bg-white/72 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="px-1 pb-2">
            <h2 className="text-sm font-extrabold text-slate-900">
              {t("menu.secondary.title", { defaultValue: "Autres options" })}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("menu.secondary.subtitle", {
                defaultValue: "Sauvegarde et réglages de l’application.",
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {secondaryCards.map((card) => (
              <MiniSectionCard key={card.path} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
