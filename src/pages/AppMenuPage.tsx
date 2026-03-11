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
  imageSrc: string;
  badge?: string;
  compact?: boolean;
};

const ImageSectionCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-all text-left min-h-[168px]"
      type="button"
    >
      <div className="relative h-20 sm:h-24">
        <img
          src={card.imageSrc}
          alt={card.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/menu/fallback.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/45 to-slate-900/10" />

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {card.badge && (
            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-blue-600/95 text-white px-2 py-1 rounded-full">
              {card.badge}
            </span>
          )}
          <div className="w-8 h-8 rounded-xl bg-white/90 text-slate-900 flex items-center justify-center shadow">
            {card.icon}
          </div>
        </div>

        <div className="absolute left-3 bottom-2.5 right-3">
          <div className="text-white font-extrabold text-[15px] leading-tight line-clamp-2">
            {card.title}
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="text-xs sm:text-sm text-slate-600 leading-snug line-clamp-2">
          {card.desc}
        </p>

        <div className="mt-2 inline-flex items-center text-xs sm:text-sm font-extrabold text-blue-700">
          {t("menu.open", { defaultValue: "Ouvrir" })}
          <ChevronRight size={16} className="ml-0.5" />
        </div>
      </div>

      <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-blue-200 rounded-2xl pointer-events-none" />
    </button>
  );
};

const CompactActionCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-3 shadow-sm hover:shadow-md transition-all text-left"
    >
      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
        {card.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-slate-900 truncate">
          {card.title}
        </div>
        <div className="text-xs text-slate-500 line-clamp-1">
          {card.desc}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="text-slate-400 group-hover:text-blue-600 shrink-0"
      />
    </button>
  );
};

export const AppMenuPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mainCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.quicktools.title", {
          defaultValue: "Calculs rapides chantier",
        }),
        desc: t("menu.cards.quicktools.desc", {
          defaultValue:
            "Accédez aux calculateurs rapides : conversions, pentes, conditionnements et contrôles express.",
        }),
        path: "/app/quick-tools",
        icon: <Sparkles size={18} />,
        imageSrc: "/images/menu/calcul.jpg",
        badge: t("menu.cards.quicktools.badge", { defaultValue: "RAPIDE" }),
      },
      {
        title: t("menu.cards.materials.title", {
          defaultValue: "Matériaux & Prix",
        }),
        desc: t("menu.cards.materials.desc", {
          defaultValue:
            "Ajustez les prix, créez des matériaux perso, main d’œuvre + données.",
        }),
        path: "/app/materials",
        icon: <Boxes size={18} />,
        imageSrc: "/images/menu/materiaux.jpg",
        badge: t("menu.cards.materials.badge", { defaultValue: "PRIX" }),
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Chantier" }),
        desc: t("menu.cards.house.desc", {
          defaultValue:
            "Créez un chantier et enregistrez les résultats par étape (suivi complet).",
        }),
        path: "/app/house",
        icon: <HardHat size={18} />,
        imageSrc: "/images/menu/chantier.jpg",
      },
      {
        title: t("menu.cards.projects.title", { defaultValue: "Projets" }),
        desc: t("menu.cards.projects.desc", {
          defaultValue:
            "Retrouvez vos calculs sauvegardés (estimations, matériaux, coûts).",
        }),
        path: "/app/projects",
        icon: <FolderOpen size={18} />,
        imageSrc: "/images/menu/projets.jpg",
      },
    ],
    [t]
  );

  const secondaryCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.settings.title", { defaultValue: "Réglages" }),
        desc: t("menu.cards.settings.desc", {
          defaultValue:
            "Paramétrez l’application (options, préférences, affichage).",
        }),
        path: "/app/settings",
        icon: <SettingsIcon size={18} />,
        imageSrc: "/images/menu/reglages.jpg",
        compact: true,
      },
      {
        title: t("menu.cards.backup.title", { defaultValue: "Sauvegarde JSON" }),
        desc: t("menu.cards.backup.desc", {
          defaultValue:
            "Exportez/importez vos données pour éviter toute perte.",
        }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} />,
        imageSrc: "/images/menu/sauvegarde.jpg",
        badge: t("menu.cards.backup.badge", { defaultValue: "SAFE" }),
        compact: true,
      },
    ],
    [t]
  );

  const goTo = (path: string) => {
    navigate(path);
  };

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/images/menu/background.jpg"
          alt="Fond chantier"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/menu/fallback.jpg";
          }}
        />
        <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10">
        <div className="bg-white/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <LayoutGrid size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                  {t("menu.title", { defaultValue: "Menu de l'application" })}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {t("menu.subtitle", {
                    defaultValue: "Accès direct aux sections + aux outils",
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/app/projects")}
              className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0"
              title={t("menu.back_dashboard_title", {
                defaultValue: "Retour au tableau de bord",
              })}
              type="button"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              <span className="hidden sm:inline">
                {t("menu.back_dashboard", { defaultValue: "Tableau de bord" })}
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {mainCards.map((card) => (
              <ImageSectionCard
                key={`${card.path}-${card.title}`}
                card={card}
                onClick={() => goTo(card.path)}
              />
            ))}
          </div>

          <div className="bg-white/92 backdrop-blur-sm border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-extrabold text-slate-900">
                {t("menu.secondary.title", { defaultValue: "Autres options" })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("menu.secondary.subtitle", {
                  defaultValue: "Sauvegarde et réglages de l’application.",
                })}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {secondaryCards.map((card) => (
                <CompactActionCard
                  key={`${card.path}-${card.title}`}
                  card={card}
                  onClick={() => goTo(card.path)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};