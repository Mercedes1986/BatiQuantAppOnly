import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRightLeft,
  Cable,
  ChevronRight,
  Grid2x2,
  Home,
  LayoutGrid,
  Package2,
  PaintBucket,
  PanelsTopLeft,
  Ruler,
  TrendingUp,
} from "lucide-react";

import { QuickToolsCalculator, type ToolKey } from "@/components/calculators/QuickToolsCalc";
import type { CalculationResult } from "@/types";

type ToolConfig = {
  key: ToolKey;
  title: string;
  description: string;
  icon: React.ElementType;
};

const ToolCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  openLabel: string;
  onClick: () => void;
}> = ({ title, description, icon: Icon, openLabel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
  >
    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
      <Icon size={20} />
    </div>
    <div className="text-lg font-extrabold text-slate-900">{title}</div>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    <div className="mt-4 inline-flex items-center text-sm font-extrabold text-blue-700">
      {openLabel} <ChevronRight size={18} className="ml-1" />
    </div>
  </button>
);

export const QuickToolsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tool } = useParams<{ tool?: string }>();
  const [result, setResult] = React.useState<CalculationResult | null>(null);

  const tr = React.useCallback(
    (fr: string, en: string) => (i18n.language?.startsWith("fr") ? fr : en),
    [i18n.language]
  );
  const tt = React.useCallback(
    (key: string, fr: string, en: string) => t(key, { defaultValue: tr(fr, en) }),
    [t, tr]
  );

  const tools = React.useMemo<ToolConfig[]>(
    () => [
      {
        key: "convert",
        title: tt("quick.tools.convert", "Convertisseur", "Converter"),
        description: tt("quick.cards.convert", "Surface, volume, litres et sacs théoriques.", "Surface, volume, liters and theoretical bags."),
        icon: ArrowRightLeft,
      },
      {
        key: "netArea",
        title: tt("quick.tools.net_area", "Surface nette", "Net area"),
        description: tt("quick.cards.net_area", "Déductions d'ouvertures et pertes.", "Opening deductions and waste."),
        icon: Ruler,
      },
      {
        key: "packaging",
        title: tt("quick.tools.packaging", "Conditionnements", "Packaging"),
        description: tt("quick.cards.packaging", "Consommation, conditionnements et coût estimé.", "Consumption, packages and estimated cost."),
        icon: Package2,
      },
      {
        key: "slope",
        title: tt("quick.tools.slope", "Pente", "Slope"),
        description: tt("quick.cards.slope", "Pourcentage, angle, cm par mètre.", "Percent, angle, cm per meter."),
        icon: TrendingUp,
      },
      {
        key: "linear",
        title: tt("quick.tools.linear", "Linéaires", "Linear runs"),
        description: tt("quick.cards.linear", "Recouvrements, pertes et nombre de pièces.", "Overlaps, waste and number of pieces."),
        icon: Ruler,
      },
      {
        key: "voltageDrop",
        title: tt("quick.tools.voltage_drop", "Chute de tension", "Voltage drop"),
        description: tt("quick.cards.voltage_drop", "Estimation rapide de section et chute de tension.", "Quick estimate of section and voltage drop."),
        icon: Cable,
      },
      {
        key: "decking",
        title: tt("quick.tools.decking", "Terrasse bois", "Timber deck"),
        description: tt("quick.cards.decking", "Lames, lambourdes, plots et vis inox.", "Boards, joists, pedestals and stainless screws."),
        icon: LayoutGrid,
      },
      {
        key: "drywallFrame",
        title: tt("quick.tools.drywall_frame", "Placo détaillé ossature", "Detailed drywall"),
        description: tt("quick.cards.drywall_frame", "Cloison, doublage, plafond, rails et montants.", "Partition, lining, ceiling, tracks and studs."),
        icon: PanelsTopLeft,
      },
      {
        key: "tileDetailed",
        title: tt("quick.tools.tile_detailed", "Carrelage détaillé", "Detailed tiling"),
        description: tt("quick.cards.tile_detailed", "Carreaux, colle, joint, plinthes et primaire.", "Tiles, adhesive, grout, skirtings and primer."),
        icon: Grid2x2,
      },
      {
        key: "packagingAdvanced",
        title: tt("quick.tools.packaging_advanced", "Sacs / seaux / cartouches", "Bags / buckets / cartridges"),
        description: tt("quick.cards.packaging_advanced", "Préréglages produits avec couches, pertes et coût.", "Product presets with coats, waste and cost."),
        icon: PaintBucket,
      },
      {
        key: "fence",
        title: tt("quick.tools.fence", "Clôture / grillage", "Fence / mesh"),
        description: tt("quick.cards.fence", "Panneaux, poteaux et béton de scellement.", "Panels, posts and post concrete."),
        icon: Ruler,
      },
      {
        key: "bulkFill",
        title: tt("quick.tools.bulk_fill", "Gravier / remblai / sable", "Gravel / fill / sand"),
        description: tt("quick.cards.bulk_fill", "Volume, tonnage, big bags et géotextile.", "Volume, tonnage, big bags and geotextile."),
        icon: Package2,
      },
      {
        key: "insulation",
        title: tt("quick.tools.insulation", "Isolation murs / combles", "Wall / attic insulation"),
        description: tt("quick.cards.insulation", "Surface, épaisseur, R et rouleaux d’isolant.", "Area, thickness, R-value and insulation rolls."),
        icon: PanelsTopLeft,
      },
      {
        key: "roofFrame",
        title: tt("quick.tools.roof_frame", "Toiture / chevrons / liteaux", "Roof / rafters / battens"),
        description: tt("quick.cards.roof_frame", "Pente, surface de toiture, chevrons, liteaux et couverture.", "Slope, roof area, rafters, battens and covering."),
        icon: Home,
      },
    ],
    [tt]
  );

  const activeTool = tools.find((item) => item.key === tool);
  const euro = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
      }),
    [i18n.language]
  );

  React.useEffect(() => {
    setResult(null);
  }, [tool]);

  if (tool && !activeTool) {
    navigate("/app/quick-tools", { replace: true });
    return null;
  }

  if (activeTool) {
    const Icon = activeTool.icon;
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 pb-20">
        <div className="sticky top-0 z-10 flex items-center bg-blue-700 p-4 text-white shadow-md">
          <button
            onClick={() => navigate("/app/quick-tools")}
            className="mr-4 rounded-full p-2 transition-colors hover:bg-white/20"
            type="button"
            aria-label={t("common.back", { defaultValue: tr("Retour", "Back") })}
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{activeTool.title}</h1>
            <p className="text-xs opacity-90">{tt("quick.page_precision", "Calcul rapide dédié", "Dedicated quick calculator")}</p>
          </div>

          <div className="ml-3 hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/15 md:flex">
            <Icon size={18} />
          </div>
        </div>

        <div className="space-y-6 p-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <QuickToolsCalculator onCalculate={setResult} forcedTool={activeTool.key} hideToolSelector />
          </div>

          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
              <div className="relative overflow-hidden rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-lg">
                <h2 className="mb-1 text-sm uppercase tracking-wider text-slate-500">
                  {t("calculator.result_estimated", { defaultValue: tr("Résultat estimé", "Estimated result") })}
                </h2>
                <p className="mb-4 text-4xl font-extrabold text-blue-600">{result.summary}</p>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
                  {result.details.map((d, i) => (
                    <div key={i}>
                      <span className="block text-slate-500">{d.label}</span>
                      <span className="font-semibold text-slate-800">
                        {d.value} {d.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {result.materials.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800">
                      {t("calculator.materials_estimated", { defaultValue: tr("Matériaux estimés", "Estimated materials") })}
                    </h3>
                    <span className="text-lg font-extrabold text-emerald-600">~ {euro.format(Number(result.totalCost || 0))}</span>
                  </div>

                  <ul className="space-y-4 text-sm">
                    {result.materials.map((m) => (
                      <li key={m.id} className="border-b border-slate-50 pb-2 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 truncate font-medium text-slate-700">{m.name}</span>
                          <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 font-extrabold text-slate-800">
                            {m.quantity} {m.unit}
                          </span>
                        </div>

                        {m.details && (
                          <p className="mt-1 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">{m.details}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-20">
      <div className="mx-auto max-w-7xl p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{tt("quick.page_title", "Calculs rapides chantier", "Quick site tools")}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                {tt(
                  "quick.page_subtitle",
                  "Outils autonomes pour conversions, surfaces nettes, conditionnements, terrasse bois, placo détaillé, carrelage détaillé, toiture, clôture, gravier / remblai et isolation.",
                  "Standalone tools for conversions, net areas, packaging, timber decking, detailed drywall, detailed tiling, roofing, fencing, gravel / fill and insulation."
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((item) => (
            <ToolCard
              key={item.key}
              title={item.title}
              description={item.description}
              icon={item.icon}
              openLabel={t("menu.open", { defaultValue: tr("Ouvrir", "Open") })}
              onClick={() => navigate(`/app/quick-tools/${item.key}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
