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

const getToolConfigs = (t: ReturnType<typeof useTranslation>["t"]): ToolConfig[] => [
  {
    key: "convert",
    title: t("quick.tools.convert", { defaultValue: "Converter" }),
    description: t("quick.cards.convert", { defaultValue: "Surface, volume, litres et sacs théoriques." }),
    icon: ArrowRightLeft,
  },
  {
    key: "netArea",
    title: t("quick.tools.net_area", { defaultValue: "Net area" }),
    description: t("quick.cards.net_area", { defaultValue: "Déductions d'ouvertures et pertes." }),
    icon: Ruler,
  },
  {
    key: "packaging",
    title: t("quick.tools.packaging", { defaultValue: "Packaging" }),
    description: t("quick.cards.packaging", { defaultValue: "Consommation, packs et coût estimé." }),
    icon: Package2,
  },
  {
    key: "slope",
    title: t("quick.tools.slope", { defaultValue: "Slope" }),
    description: t("quick.cards.slope", { defaultValue: "Pourcentage, angle, cm par mètre." }),
    icon: TrendingUp,
  },
  {
    key: "linear",
    title: t("quick.tools.linear", { defaultValue: "Linear runs" }),
    description: t("quick.cards.linear", { defaultValue: "Recouvrements, pertes et nombre de pièces." }),
    icon: Ruler,
  },
  {
    key: "voltageDrop",
    title: t("quick.tools.voltage_drop", { defaultValue: "Chute de tension" }),
    description: t("quick.cards.voltage_drop", { defaultValue: "Estimation rapide de section et chute." }),
    icon: Cable,
  },
  {
    key: "decking",
    title: t("quick.tools.decking", { defaultValue: "Timber deck" }),
    description: t("quick.cards.decking", { defaultValue: "Lames, lambourdes, plots et vis inox." }),
    icon: LayoutGrid,
  },
  {
    key: "drywallFrame",
    title: t("quick.tools.drywall_frame", { defaultValue: "Detailed drywall" }),
    description: t("quick.cards.drywall_frame", { defaultValue: "Cloison, doublage, plafond, rails et montants." }),
    icon: PanelsTopLeft,
  },
  {
    key: "tileDetailed",
    title: t("quick.tools.tile_detailed", { defaultValue: "Detailed tiling" }),
    description: t("quick.cards.tile_detailed", { defaultValue: "Carreaux, colle, joint, plinthes et primaire." }),
    icon: Grid2x2,
  },
  {
    key: "packagingAdvanced",
    title: t("quick.tools.packaging_advanced", { defaultValue: "Bags / buckets / cartridges" }),
    description: t("quick.cards.packaging_advanced", { defaultValue: "Préréglages produits avec couches, pertes et coût." }),
    icon: PaintBucket,
  },
  {
    key: "fence",
    title: t("quick.tools.fence", { defaultValue: "Fence / mesh" }),
    description: t("quick.cards.fence", { defaultValue: "Panneaux, poteaux et béton de scellement." }),
    icon: Ruler,
  },
  {
    key: "bulkFill",
    title: t("quick.tools.bulk_fill", { defaultValue: "Gravel / fill / sand" }),
    description: t("quick.cards.bulk_fill", { defaultValue: "Volume, tonnage, big bags et géotextile." }),
    icon: Package2,
  },
  {
    key: "insulation",
    title: t("quick.tools.insulation", { defaultValue: "Wall / attic insulation" }),
    description: t("quick.cards.insulation", { defaultValue: "Surface, épaisseur, R et rouleaux d’isolant." }),
    icon: PanelsTopLeft,
  },
  {
    key: "roofFrame",
    title: t("quick.tools.roof_frame", { defaultValue: "Roof / rafters / battens" }),
    description: t("quick.cards.roof_frame", { defaultValue: "Pente, surface de toiture, chevrons, liteaux et couverture." }),
    icon: Home,
  },
];

const ToolCard: React.FC<{ title: string; description: string; icon: React.ElementType; onClick: () => void }> = ({
  title,
  description,
  icon: Icon,
  onClick,
}) => (
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
      Ouvrir <ChevronRight size={18} className="ml-1" />
    </div>
  </button>
);

export const QuickToolsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tool } = useParams<{ tool?: string }>();
  const [result, setResult] = React.useState<CalculationResult | null>(null);

  const tools = React.useMemo(() => getToolConfigs(t), [t]);
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
            aria-label={t("common.back", { defaultValue: "Back" })}
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{activeTool.title}</h1>
            <p className="text-xs opacity-90">{t("quick.page_precision", { defaultValue: "Dedicated quick calculator" })}</p>
          </div>

          <div className="ml-3 hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/15 md:flex">
            <Icon size={18} />
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <QuickToolsCalculator onCalculate={setResult} forcedTool={activeTool.key} hideToolSelector />
          </div>

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative overflow-hidden rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-lg">
                <h2 className="mb-1 text-sm uppercase tracking-wider text-slate-500">
                  {t("calculator.result_estimated", { defaultValue: "Estimated result" })}
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
                      {t("calculator.materials_estimated", { defaultValue: "Estimated materials" })}
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
              <h1 className="text-2xl font-extrabold text-slate-900">
                {t("quick.page_title", { defaultValue: "Quick site tools" })}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                {t("quick.page_subtitle", {
                  defaultValue:
                    "Standalone tools for conversions, net areas, packaging, timber decking, detailed drywall, detailed tiling, roofing, fencing, gravel / fill and insulation.",
                })}
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
              onClick={() => navigate(`/app/quick-tools/${item.key}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
