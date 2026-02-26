import React, { Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ArrowLeft,
  ShieldCheck,
  Hammer,
  HardHat,
  FolderOpen,
  Boxes,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { CalculatorPage } from "@/pages/CalculatorPage";
import { CalculatorType } from "@/types";
import { CALCULATORS } from "@/constants";
import { CalculatorCard } from "@/components/ui/CalculatorCard";

type SectionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  imageSrc: string;
  badge?: string;
};

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
    <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mb-2" />
    <span className="text-sm">Chargement...</span>
  </div>
);

const ImageSectionCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow text-left"
    >
      {/* image */}
      <div className="relative h-28 sm:h-32">
        <img
          src={card.imageSrc}
          alt={card.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // fallback si l'image n'existe pas
            (e.currentTarget as HTMLImageElement).src = "/images/menu/fallback.jpg";
          }}
        />

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />

        <div className="absolute top-3 right-3 flex items-center gap-2">
          {card.badge && (
            <span className="text-[10px] font-extrabold uppercase tracking-wide bg-blue-600/90 text-white px-2 py-1 rounded-full">
              {card.badge}
            </span>
          )}
          <div className="w-9 h-9 rounded-xl bg-white/90 text-slate-900 flex items-center justify-center shadow">
            {card.icon}
          </div>
        </div>

        <div className="absolute left-4 bottom-3">
          <div className="text-white font-extrabold text-base sm:text-lg">
            {card.title}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="p-4">
        <p className="text-sm text-slate-600 leading-snug">{card.desc}</p>

        <div className="mt-3 inline-flex items-center text-sm font-extrabold text-blue-700">
          Ouvrir <ChevronRight size={18} className="ml-1" />
        </div>
      </div>

      {/* focus ring */}
      <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-blue-200 rounded-2xl pointer-events-none" />
    </button>
  );
};

export const AppMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCalc, setSelectedCalc] = useState<CalculatorType | null>(null);

  // ✅ Cartes “sections” avec images dédiées (1 image par carte)
  // 👉 Ajoute ces images dans: public/images/menu/
  // - calcul.jpg, chantier.jpg, projets.jpg, materiaux.jpg, reglages.jpg, sauvegarde.jpg (+ fallback.jpg)
  const sectionCards: SectionCard[] = useMemo(
    () => [
      {
        title: "Calcul",
        desc: "Accédez à tous les calculateurs pour estimer quantités et coûts.",
        path: "#tools",
        icon: <Hammer size={18} />,
        imageSrc: "/images/menu/calcul.jpg",
        badge: "Outils",
      },
      {
        title: "Chantier",
        desc: "Créez un chantier et enregistrez les résultats par étape (suivi complet).",
        path: "/app/house",
        icon: <HardHat size={18} />,
        imageSrc: "/images/menu/chantier.jpg",
      },
      {
        title: "Projets",
        desc: "Retrouvez vos calculs sauvegardés (estimations, matériaux, coûts).",
        path: "/app/projects",
        icon: <FolderOpen size={18} />,
        imageSrc: "/images/menu/projets.jpg",
      },
      {
        title: "Matériaux & Prix",
        desc: "Ajustez les prix, créez des matériaux perso, main d’œuvre + données.",
        path: "/app/materials",
        icon: <Boxes size={18} />,
        imageSrc: "/images/menu/materiaux.jpg",
      },
      {
        title: "Réglages",
        desc: "Paramétrez l’application (options, préférences, affichage).",
        path: "/app/settings",
        icon: <SettingsIcon size={18} />,
        imageSrc: "/images/menu/reglages.jpg",
      },
      {
        title: "Sauvegarde JSON",
        desc: "Exportez/importez vos données pour éviter toute perte (recommandé).",
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} />,
        imageSrc: "/images/menu/sauvegarde.jpg",
        badge: "Recommandé",
      },
    ],
    []
  );

  // Mode “outil direct” (ouvre le calculateur dans la même page)
  if (selectedCalc) {
    return (
      <Suspense
        fallback={
          <div className="h-screen bg-slate-50 flex items-center justify-center">
            <PageLoader />
          </div>
        }
      >
        <CalculatorPage
          type={selectedCalc}
          onBack={() => setSelectedCalc(null)}
          onNavigateProjects={() => {
            setSelectedCalc(null);
            navigate("/app/projects");
          }}
        />
      </Suspense>
    );
  }

  const goTo = (path: string) => {
    if (path === "#tools") {
      const el = document.getElementById("tools");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate(path);
  };

  return (
    <div className="pb-20 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Menu de l’application
              </h1>
              <p className="text-xs text-slate-500">
                Accès direct aux sections + aux outils
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/app")}
              className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={16} className="mr-2" />
              Tableau de bord
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Bloc “comment ça marche” */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="font-extrabold text-slate-900">Comment ça marche ?</div>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Utilisez <b>Calcul</b> pour estimer vos quantités, puis <b>Projets</b> pour retrouver vos calculs.
                Pour un suivi complet, créez un <b>Chantier</b> et enregistrez les résultats par étape.
                Pensez à <b>exporter en JSON</b> pour sauvegarder vos données.
              </p>
            </div>
          </div>
        </div>

        {/* Sections en cartes images */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionCards.map((c) => (
            <ImageSectionCard key={c.title} card={c} onClick={() => goTo(c.path)} />
          ))}
        </div>

        {/* Tous les outils avec les mêmes cards “image” que la page Calcul */}
        <div id="tools" className="mt-8">
          <h2 className="text-xl font-extrabold text-slate-900">
            Tous les outils (accès direct)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Cliquez sur un outil pour ouvrir le calculateur directement.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CALCULATORS.map((calc) => (
              <CalculatorCard
                key={calc.id}
                config={calc}
                onClick={() => setSelectedCalc(calc.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};