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
    description: t("quick.cards.convert", { defaultValue: "Area, volume, litres and estimated bags." }),
    icon: ArrowRightLeft,
  },
  {
    key: "netArea",
    title: t("quick.tools.net_area", { defaultValue: "Net area" }),
    description: t("quick.cards.net_area", { defaultValue: "Openings deduction and net area." }),
    icon: Ruler,
  },
  {
    key: "packaging",
    title: t("quick.tools.packaging", { defaultValue: "Packaging" }),
    description: t("quick.cards.packaging", { defaultValue: "Consumption, packs and theoretical cost." }),
    icon: Package2,
  },
  {
    key: "slope",
    title: t("quick.tools.slope", { defaultValue: "Slope" }),
    description: t("quick.cards.slope", { defaultValue: "Slope in %, cm/m, angle and real length." }),
    icon: TrendingUp,
  },
  {
    key: "linear",
    title: t("quick.tools.linear", { defaultValue: "Linears" }),
    description: t("quick.cards.linear", { defaultValue: "Overlaps, wastage and number of linear pieces." }),
    icon: Ruler,
  },
  {
    key: "voltageDrop",
    title: t("quick.tools.voltage_drop", { defaultValue: "Voltage drop" }),
    description: t("quick.cards.voltage_drop", { defaultValue: "Cable section, voltage drop and recommendation." }),
    icon: Cable,
  },
  {
    key: "decking",
    title: t("quick.tools.decking", { defaultValue: "Timber decking" }),
    description: t("quick.cards.decking", { defaultValue: "Boards, joists, pedestals and stainless screws." }),
    icon: LayoutGrid,
  },
  {
    key: "drywallFrame",
    title: t("quick.tools.drywall_frame", { defaultValue: "Drywall framing (detailed)" }),
    description: t("quick.cards.drywall_frame", { defaultValue: "Partitions, linings, ceilings, tracks and studs." }),
    icon: PanelsTopLeft,
  },
  {
    key: "tileDetailed",
    title: t("quick.tools.tile_detailed", { defaultValue: "Detailed tiling" }),
    description: t("quick.cards.tile_detailed", { defaultValue: "Tiles, adhesive, grout, skirting and primer." }),
    icon: Grid2x2,
  },
  {
    key: "packagingAdvanced",
    title: t("quick.tools.packaging_advanced", { defaultValue: "Bags / buckets / cartridges" }),
    description: t("quick.cards.packaging_advanced", { defaultValue: "Multi-coat products and detailed packaging." }),
    icon: PaintBucket,
  },
  {
    key: "fence",
    title: t("quick.tools.fence", { defaultValue: "Fence" }),
    description: t("quick.cards.fence", { defaultValue: "Panels, posts and concrete bags." }),
    icon: Ruler,
  },
  {
    key: "bulkFill",
    title: t("quick.tools.bulk_fill", { defaultValue: "Bulk fill" }),
    description: t("quick.cards.bulk_fill", { defaultValue: "Volume, tonnage, bulk bags and geotextile." }),
    icon: Package2,
  },
  {
    key: "insulation",
    title: t("quick.tools.insulation", { defaultValue: "Insulation" }),
    description: t("quick.cards.insulation", { defaultValue: "Area, thickness, R-value and insulation rolls." }),
    icon: PanelsTopLeft,
  },
  {
    key: "roofFrame",
    title: t("quick.tools.roof_frame", { defaultValue: "Roof frame" }),
    description: t("quick.cards.roof_frame", { defaultValue: "Pitch, roof area, rafters, battens and covering." }),
    icon: Home,
  },
];

const ToolCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  openLabel: string;
}> = ({ title, description, icon: Icon, onClick, openLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className="group app-card w-full rounded-[28px] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(37,99,235,0.14)]"
  >
    <div className="mb-8 flex items-start justify-between gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
        <Icon size={20} />
      </div>
      <ChevronRight size={18} className="text-slate-400" />
    </div>

    <div className="text-xl font-extrabold text-slate-900">{title}</div>
    <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
    <div className="mt-5 text-sm font-extrabold text-blue-700">{openLabel}</div>
  </button>
);

export const QuickToolsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tool } = useParams<{ tool?: string }>();

  const [result, setResult] = React.useState<CalculationResult | null>(null);
  const handleCalculated = React.useCallback((nextResult: CalculationResult) => {
    setResult(nextResult);
  }, []);

  const tools = React.useMemo(() => getToolConfigs(t), [t]);
  const activeTool = tools.find((item) => item.key === tool);
  const euro = React.useMemo(
    () => new Intl.NumberFormat(i18n.language || undefined, { style: "currency", currency: "EUR" }),
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
    const ActiveToolIcon = activeTool.icon;

    return (
      <div className="app-shell app-shell--quick min-h-full safe-bottom-offset">
        <div className="page-narrow space-y-4">
          <section className="glass-panel rounded-[32px] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/app/quick-tools")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                type="button"
                aria-label={t("common.back", { defaultValue: "Back" })}
              >
                <ArrowLeft size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[28px] font-extrabold tracking-tight text-slate-900">{activeTool.title}</h1>
                <p className="text-sm text-slate-500">
                  {t("quick.page_precision", { defaultValue: "Dedicated quick calculator" })}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <ActiveToolIcon size={18} />
              </div>
            </div>
          </section>

          <section className="app-card rounded-[30px] p-4 sm:p-5">
            <QuickToolsCalculator onCalculate={handleCalculated} forcedTool={activeTool.key} hideToolSelector />
          </section>

          {result && (
            <div className="space-y-4">
              <section className="app-card rounded-[30px] border border-blue-200 p-5 sm:p-6">
                <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  {t("calculator.result_estimated", { defaultValue: "Estimated result" })}
                </h2>
                <p className="mb-5 text-3xl font-extrabold leading-tight text-blue-600 sm:text-4xl">{result.summary}</p>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
                  {result.details.map((detail, index) => (
                    <div key={index}>
                      <span className="block text-slate-500">{detail.label}</span>
                      <span className="font-semibold text-slate-800">
                        {detail.value} {detail.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {result.materials.length > 0 && (
                <section className="app-card rounded-[28px] p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800">
                      {t("calculator.materials_estimated", { defaultValue: "Estimated materials" })}
                    </h3>
                    <span className="text-lg font-extrabold text-emerald-600">~ {euro.format(Number(result.totalCost || 0))}</span>
                  </div>

                  <ul className="space-y-4 text-sm">
                    {result.materials.map((material) => (
                      <li key={material.id} className="border-b border-slate-50 pb-2 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 truncate font-medium text-slate-700">{material.name}</span>
                          <span className="whitespace-nowrap rounded-xl bg-slate-100 px-2.5 py-1 font-extrabold text-slate-800">
                            {material.quantity} {material.unit}
                          </span>
                        </div>
                        {material.details && (
                          <p className="mt-1 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">{material.details}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--quick min-h-full safe-bottom-offset">
      <div className="page-narrow space-y-4">
        <section className="glass-panel rounded-[32px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">
                {t("quick.page_title", { defaultValue: "Quick site tools" })}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {t("quick.page_subtitle", {
                  defaultValue:
                    "Standalone tools for conversions, net areas, packaging, timber decking, detailed drywall, detailed tiling, roofing, fencing, gravel / fill and insulation.",
                })}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tools.map((item) => (
            <ToolCard
              key={item.key}
              title={item.title}
              description={item.description}
              icon={item.icon}
              onClick={() => navigate(`/app/quick-tools/${item.key}`)}
              openLabel={t("menu.open", { defaultValue: "Open" })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
