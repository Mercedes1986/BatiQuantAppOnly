import React from "react";
import * as Icons from "lucide-react";

type CategoryVisualTone = {
  icon: keyof typeof Icons;
  chipClassName: string;
  iconClassName: string;
  badgeClassName: string;
};

const normalize = (value: string): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const includesOneOf = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle));

const resolveTone = (rawCategory: string, rawLabel?: string): CategoryVisualTone => {
  const category = normalize(rawCategory);
  const label = normalize(rawLabel || "");
  const text = `${category} ${label}`;

  if (includesOneOf(text, ["terrassement", "remblai", "excav", "tranchee", "tranche", "gravier", "agregat", "granulat", "sable", "drain"])) {
    return {
      icon: "Mountain",
      chipClassName: "border-amber-200 bg-amber-50",
      iconClassName: "text-amber-700",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (includesOneOf(text, ["beton", "concrete", "dalle", "fondation", "semelle", "coffrage", "ciment", "mortier", "chainage", "ferraillage"])) {
    return {
      icon: "Layers",
      chipClassName: "border-slate-200 bg-slate-100",
      iconClassName: "text-slate-700",
      badgeClassName: "border-slate-200 bg-slate-100 text-slate-800",
    };
  }

  if (includesOneOf(text, ["facade", "bardage", "enduit", "crepi", "ravalement", "isolation ext", "ite"])) {
    return {
      icon: "PanelTop",
      chipClassName: "border-orange-200 bg-orange-50",
      iconClassName: "text-orange-700",
      badgeClassName: "border-orange-200 bg-orange-50 text-orange-800",
    };
  }

  if (includesOneOf(text, ["bois", "menuiser", "charpente", "porte", "fenetre", "volet", "terrasse bois"])) {
    return {
      icon: "Hammer",
      chipClassName: "border-yellow-200 bg-yellow-50",
      iconClassName: "text-yellow-700",
      badgeClassName: "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  }

  if (includesOneOf(text, ["electric", "cable", "prise", "interrupteur", "tableau", "lumiere", "eclairage"])) {
    return {
      icon: "Zap",
      chipClassName: "border-yellow-200 bg-yellow-50",
      iconClassName: "text-yellow-700",
      badgeClassName: "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  }

  if (includesOneOf(text, ["plomb", "sanitaire", "evac", "eau", "tuyau", "robinet", "chauffage", "vmc", "ventilation"])) {
    return {
      icon: "Droplets",
      chipClassName: "border-cyan-200 bg-cyan-50",
      iconClassName: "text-cyan-700",
      badgeClassName: "border-cyan-200 bg-cyan-50 text-cyan-800",
    };
  }

  if (includesOneOf(text, ["placo", "isolation", "laine", "cloison", "plafond", "rail", "montant"])) {
    return {
      icon: "Square",
      chipClassName: "border-indigo-200 bg-indigo-50",
      iconClassName: "text-indigo-700",
      badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-800",
    };
  }

  if (includesOneOf(text, ["carrel", "faience", "joint", "colle", "chape", "ragreage"])) {
    return {
      icon: "Grid3X3",
      chipClassName: "border-teal-200 bg-teal-50",
      iconClassName: "text-teal-700",
      badgeClassName: "border-teal-200 bg-teal-50 text-teal-800",
    };
  }

  if (includesOneOf(text, ["peinture", "peint", "sous-couche", "vernis"])) {
    return {
      icon: "PaintRoller",
      chipClassName: "border-fuchsia-200 bg-fuchsia-50",
      iconClassName: "text-fuchsia-700",
      badgeClassName: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
    };
  }

  if (includesOneOf(text, ["cloture", "portail", "grillage", "exterieur", "jardin", "pave", "bordure"])) {
    return {
      icon: "Fence",
      chipClassName: "border-emerald-200 bg-emerald-50",
      iconClassName: "text-emerald-700",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (includesOneOf(text, ["main d'oeuvre", "main dœuvre", "labor", "mo", "service", "forfait"])) {
    return {
      icon: "Users",
      chipClassName: "border-violet-200 bg-violet-50",
      iconClassName: "text-violet-700",
      badgeClassName: "border-violet-200 bg-violet-50 text-violet-800",
    };
  }

  return {
    icon: "Package",
    chipClassName: "border-slate-200 bg-slate-50",
    iconClassName: "text-slate-600",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  };
};

export const getCategoryVisualTone = (category: string, label?: string) => resolveTone(category, label);

interface CategoryVisualProps {
  category: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const CategoryVisual: React.FC<CategoryVisualProps> = ({
  category,
  label,
  size = "md",
  className = "",
}) => {
  const tone = resolveTone(category, label);
  const IconComponent = (Icons[tone.icon] || Icons.Package) as React.ComponentType<{ className?: string; size?: number }>;

  const sizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : "h-12 w-12 rounded-2xl";

  const iconSize = size === "sm" ? 18 : size === "lg" ? 26 : 22;

  return (
    <div className={`${sizeClass} ${tone.chipClassName} ${className} flex shrink-0 items-center justify-center border`}>
      <IconComponent size={iconSize} className={tone.iconClassName} />
    </div>
  );
};

interface CategoryBadgeProps {
  category: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  label,
  className = "",
  children,
}) => {
  const tone = resolveTone(category, label);

  return (
    <span className={`${tone.badgeClassName} ${className} inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase`}>
      {children || category}
    </span>
  );
};
