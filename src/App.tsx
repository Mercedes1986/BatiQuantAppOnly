// src/App.tsx
import React, { useEffect, useMemo, useState, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useSearchParams,
  Outlet,
  Navigate,
  useOutletContext,
  Link,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

// Layout / UI
import { BottomNav } from "@/components/BottomNav";

// App pages
import { DashboardPage } from "@/pages/DashboardPage";
import { CalculatorPage } from "@/pages/CalculatorPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { HouseProjectPage } from "@/pages/HouseProjectPage";
import { MaterialsPage } from "@/pages/MaterialsPage";
import { AppMenuPage } from "@/pages/AppMenuPage";

// Documents
import { QuoteEditorPage } from "@/pages/documents/QuoteEditorPage";
import { InvoiceEditorPage } from "@/pages/documents/InvoiceEditorPage";
import { PrintDocumentPage } from "@/pages/documents/PrintDocumentPage";

// Storage
import { getHouseProjects, saveHouseProject } from "@/services/storage";

// Materials
import { getMaterialImageUrl } from "@/constants";

// Types
import { CalculatorType, ConstructionStepId } from "@/types";
import type { HouseProject } from "@/types";

import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";

// --- helper: keep prop typing for React.lazy ---
const lazyNamed = <T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) =>
  React.lazy(factory);

// -------------------------
// ErrorBoundary (class => uses i18next.t directly)
// -------------------------
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h1 className="text-xl font-extrabold text-slate-900">
              {i18next.t("errors.generic_title", { defaultValue: "Something went wrong" })}
            </h1>
            <p className="mt-2 text-slate-600">
              {i18next.t("errors.generic_hint", {
                defaultValue: "Please refresh the page or go back to the home screen.",
              })}
            </p>
            <Link to="/" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold">
              {i18next.t("common.back_home", { defaultValue: "Back to home" })}
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy Load Calculators
const StructuralCalculator = lazyNamed(() =>
  import("@/components/calculators/StructuralCalculator").then((m) => ({ default: m.StructuralCalculator }))
);
const PlacoCalculator = lazyNamed(() =>
  import("@/components/calculators/PlacoCalculator").then((m) => ({ default: m.PlacoCalculator }))
);
const ConcreteCalculator = lazyNamed(() =>
  import("@/components/calculators/ConcreteCalculator").then((m) => ({ default: m.ConcreteCalculator }))
);
const PaintCalculator = lazyNamed(() =>
  import("@/components/calculators/PaintCalculator").then((m) => ({ default: m.PaintCalculator }))
);
const TileCalculator = lazyNamed(() =>
  import("@/components/calculators/TileCalculator").then((m) => ({ default: m.TileCalculator }))
);
const LevelingCalculator = lazyNamed(() =>
  import("@/components/calculators/LevelingCalculator").then((m) => ({ default: m.LevelingCalculator }))
);
const SubstructureCalculator = lazyNamed(() =>
  import("@/components/calculators/SubstructureCalculator").then((m) => ({ default: m.SubstructureCalculator }))
);
const RoofCalculator = lazyNamed(() =>
  import("@/components/calculators/RoofCalculator").then((m) => ({ default: m.RoofCalculator }))
);
const JoineryCalculator = lazyNamed(() =>
  import("@/components/calculators/JoineryCalculator").then((m) => ({ default: m.JoineryCalculator }))
);
const ElectricityCalculator = lazyNamed(() =>
  import("@/components/calculators/ElectricityCalculator").then((m) => ({ default: m.ElectricityCalculator }))
);
const PlumbingCalculator = lazyNamed(() =>
  import("@/components/calculators/PlumbingCalculator").then((m) => ({ default: m.PlumbingCalculator }))
);
const HvacCalculator = lazyNamed(() =>
  import("@/components/calculators/HvacCalculator").then((m) => ({ default: m.HvacCalculator }))
);
const ScreedCalculator = lazyNamed(() =>
  import("@/components/calculators/ScreedCalculator").then((m) => ({ default: m.ScreedCalculator }))
);
const FacadeCalculator = lazyNamed(() =>
  import("@/components/calculators/FacadeCalculator").then((m) => ({ default: m.FacadeCalculator }))
);
const ExteriorCalculator = lazyNamed(() =>
  import("@/components/calculators/ExteriorCalculator").then((m) => ({ default: m.ExteriorCalculator }))
);
const StairCalculator = lazyNamed(() =>
  import("@/components/calculators/StairCalculator").then((m) => ({ default: m.StairCalculator }))
);
const FoundationsCalculator = lazyNamed(() =>
  import("@/components/calculators/FoundationsCalculator").then((m) => ({ default: m.FoundationsCalculator }))
);

// Loading Component
const PageLoader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Loader2 size={32} className="animate-spin mb-2" />
      <span className="text-sm">{t("common.loading", { defaultValue: "Loading…" })}</span>
    </div>
  );
};

// ✅ Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, location.search]);
  return null;
};

// -------------------------
// ✅ calc resolver (alias + validation)
// -------------------------
const resolveCalcFromParam = (raw: string | null): CalculatorType | null => {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;

  const alias: Record<string, CalculatorType> = {
    STRUCTURAL: CalculatorType.WALLS,
    PARPAING: CalculatorType.WALLS,
    BETON: CalculatorType.CONCRETE,
    PLACO: CalculatorType.PLACO,
    PEINTURE: CalculatorType.PAINT,
    CARRELAGE: CalculatorType.TILES,
    ELECTRICITE: CalculatorType.ELECTRICITY,
    PLOMBERIE: CalculatorType.PLUMBING,
    TOITURE: CalculatorType.ROOF,
    FONDATIONS: CalculatorType.FOUNDATIONS,
    RAGREAGE: CalculatorType.RAGREAGE,
    TERRASSEMENT: CalculatorType.SUBSTRUCTURE,
  };

  const resolved = (alias[s] as unknown as string) || s;

  const allowed = new Set<string>(Object.values(CalculatorType) as unknown as string[]);
  if (!allowed.has(resolved)) return null;

  return resolved as CalculatorType;
};

// --- 1. Project Context Wrapper ---
const ProjectCalculatorWrapper: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const calcType = useMemo(() => resolveCalcFromParam(searchParams.get("calc")), [searchParams]);
  const projectId = searchParams.get("projectId");
  const stepId = searchParams.get("stepId") as ConstructionStepId;

  const [project, setProject] = useState<HouseProject | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!projectId) return;
    const p = getHouseProjects().find((h) => h.id === projectId);
    if (p) setProject(p);
  }, [projectId]);

  const handleBack = () => {
    if (projectId) navigate(`/app/house?id=${projectId}`);
    else navigate("/app/house");
  };

  const normalize = (s: unknown) => String(s ?? "").trim().toLowerCase();

  const handleSave = () => {
    if (!project || !result || !stepId) return;

    const updatedProject: HouseProject = { ...project };
    updatedProject.steps = {
      ...updatedProject.steps,
      [stepId]: {
        status: "done",
        materials: result.materials,
        cost: result.totalCost,
        notes: result.summary,
      },
    };

    const structuralSteps: ConstructionStepId[] = [
      ConstructionStepId.GROUNDWORK,
      ConstructionStepId.FOUNDATIONS,
      ConstructionStepId.BASEMENT,
      ConstructionStepId.SLAB_GROUND,
      ConstructionStepId.WALLS,
    ];

    // ✅ avoid depending on translated labels only (supports key if present + FR/EN matching)
    if (structuralSteps.includes(stepId) && Array.isArray(result.details)) {
      const areaNeedles = [
        "area",
        "surface",
        "m²",
        normalize(t("struct.common.surface", { defaultValue: "Area" })),
      ];
      const perimNeedles = [
        "perimeter",
        "périmètre",
        "perimetre",
        normalize(t("joinery.stats.perimeter", { defaultValue: "Total perimeter" })),
      ];

      const isMatch = (label: unknown, needles: string[]) => {
        const L = normalize(label);
        return needles.some((n) => n && L.includes(normalize(n)));
      };

      const surfaceDetail = result.details.find(
        (d: any) =>
          d?.key === "area" ||
          d?.id === "area" ||
          isMatch(d?.label, areaNeedles) ||
          isMatch(d?.unit, ["m²", "sqm"])
      );

      const perimDetail = result.details.find(
        (d: any) =>
          d?.key === "perimeter" ||
          d?.id === "perimeter" ||
          isMatch(d?.label, perimNeedles) ||
          isMatch(d?.unit, ["m"])
      );

      if (surfaceDetail?.value) {
        const val = parseFloat(surfaceDetail.value);
        if (!isNaN(val) && val > 0) updatedProject.params.surfaceArea = val;
      }
      if (perimDetail?.value) {
        const val = parseFloat(perimDetail.value);
        if (!isNaN(val) && val > 0) updatedProject.params.perimeter = val;
      }
    }

    saveHouseProject(updatedProject);
    handleBack();
  };

  const renderCalculator = () => {
    const props = {
      onCalculate: setResult,
      initialArea: project?.params.surfaceArea,
      initialPerimeter: project?.params.perimeter,
    };

    switch (calcType) {
      case CalculatorType.STRUCTURAL:
      case CalculatorType.GROUNDWORK:
      case CalculatorType.WALLS: {
        let structMode: "groundwork" | "foundations" | "walls" = "groundwork";
        if (stepId === ConstructionStepId.GROUNDWORK || calcType === CalculatorType.GROUNDWORK) structMode = "groundwork";
        if (stepId === ConstructionStepId.WALLS || calcType === CalculatorType.WALLS) structMode = "walls";

        const isStructSpecific = !!stepId || calcType === CalculatorType.GROUNDWORK || calcType === CalculatorType.WALLS;
        return <StructuralCalculator {...props} initialMode={structMode} hideTabs={isStructSpecific} />;
      }

      case CalculatorType.FOUNDATIONS:
        return <FoundationsCalculator {...props} />;

      case CalculatorType.PLACO: {
        let placoMode: "partition" | "lining" | "ceiling" = "partition";
        if (stepId === ConstructionStepId.PARTITIONS) placoMode = "partition";
        if (stepId === ConstructionStepId.LINING) placoMode = "lining";
        if (stepId === ConstructionStepId.CEILINGS) placoMode = "ceiling";

        const isPlacoSpecific =
          !!stepId &&
          (stepId === ConstructionStepId.PARTITIONS ||
            stepId === ConstructionStepId.LINING ||
            stepId === ConstructionStepId.CEILINGS);

        return <PlacoCalculator {...props} initialMode={placoMode} hideTabs={isPlacoSpecific} />;
      }

      case CalculatorType.CONCRETE:
        return <ConcreteCalculator {...props} />;
      case CalculatorType.PAINT:
        return <PaintCalculator {...props} />;
      case CalculatorType.TILES:
        return <TileCalculator {...props} />;
      case CalculatorType.RAGREAGE:
        return <LevelingCalculator {...props} />;
      case CalculatorType.SUBSTRUCTURE:
        return <SubstructureCalculator {...props} />;
      case CalculatorType.ROOF:
        return <RoofCalculator {...props} />;
      case CalculatorType.JOINERY:
        return <JoineryCalculator {...props} />;
      case CalculatorType.ELECTRICITY:
        return <ElectricityCalculator {...props} />;
      case CalculatorType.PLUMBING:
        return <PlumbingCalculator {...props} />;
      case CalculatorType.HVAC:
        return <HvacCalculator {...props} />;
      case CalculatorType.SCREED:
        return <ScreedCalculator {...props} />;
      case CalculatorType.FACADE:
        return <FacadeCalculator {...props} />;
      case CalculatorType.EXTERIOR:
        return <ExteriorCalculator {...props} />;
      case CalculatorType.STAIRS:
        return <StairCalculator {...props} />;
      default:
        return <div>{t("common.unknown", { defaultValue: "Unknown" })}</div>;
    }
  };

  // ✅ If calc unknown => clean redirect
  useEffect(() => {
    if (searchParams.get("calc") && !calcType) {
      navigate("/app/calculator", { replace: true });
    }
  }, [calcType, navigate, searchParams]);

  const euro = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" });

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white text-slate-800 p-4 flex justify-between items-center shadow-sm border-b border-slate-200">
        <button onClick={handleBack} className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600">
          <ArrowLeft size={18} className="mr-1" />
          {t("common.back", { defaultValue: "Back" })}
        </button>

        <h1 className="font-bold text-slate-900">{project?.name || t("calculator.title_fallback", { defaultValue: "Calculator" })}</h1>

        <button
          onClick={handleSave}
          disabled={!result}
          className={[
            "flex items-center px-3 py-1.5 rounded-lg font-extrabold text-sm",
            result ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          <Save size={16} className="mr-1" />
          {t("common.save", { defaultValue: "Save" })}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <Suspense fallback={<PageLoader />}>{renderCalculator()}</Suspense>
        </div>

        {result && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-blue-600">
              <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-1">
                {t("calculator.result_estimated", { defaultValue: "Estimated result" })}
              </h2>
              <p className="text-3xl font-bold text-slate-900 mb-4">{result.summary}</p>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
                {Array.isArray(result.details) &&
                  result.details.map((d: any, i: number) => (
                    <div key={i}>
                      <span className="block text-slate-500">{d.label}</span>
                      <span className="font-semibold text-slate-800">
                        {d.value} {d.unit}
                      </span>
                    </div>
                  ))}
              </div>

              {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
                  <div className="flex items-center mb-1 font-extrabold">
                    <AlertTriangle size={16} className="mr-2" />
                    {t("common.attention", { defaultValue: "Warning" })}
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-slate-800">
                  {t("calculator.materials_estimated", { defaultValue: "Estimated materials" })}
                </h3>
                <span className="text-emerald-600 font-extrabold text-lg">
                  ~ {euro.format(Number(result.totalCost || 0))}
                </span>
              </div>

              <ul className="space-y-3 text-sm">
                {Array.isArray(result.materials) &&
                  result.materials.map((m: any) => (
                    <li key={m.id} className="border-b border-slate-50 last:border-0 pb-2">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {(m.refKey || m.key) && (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                              <img
                                src={getMaterialImageUrl(String(m.refKey || m.key))}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                draggable={false}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "/images/materials/_missing.png";
                                }}
                              />
                            </div>
                          )}

                          <span className="font-medium text-slate-700 truncate">{m.name}</span>
                        </div>

                        <span className="font-extrabold bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
                          {m.quantity} {m.unit}
                        </span>
                      </div>
                      {m.details && (
                        <p className="text-xs text-slate-500 mt-1 italic pl-2 border-l-2 border-slate-200">{m.details}</p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
              <span className="text-sm text-blue-800">
                {t("calculator.click_to_validate_step", { defaultValue: "Click to validate this step" })}
              </span>
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-extrabold text-sm shadow-md hover:bg-blue-700 transition-colors"
              >
                <Save size={16} className="mr-2" />
                {t("calculator.save_result", { defaultValue: "Save result" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 2. Layouts ---
const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCalc, setCurrentCalc] = useState<CalculatorType | null>(null);

  // Background image per section (served from /public/backgrounds)
  const bgUrl = useMemo(() => {
    // IMPORTANT: ensure absolute URLs in dev/prod.
    // If BASE_URL is empty (common in dev), we still want `/backgrounds/...` (not `backgrounds/...`).
    const rawBase = (import.meta.env.BASE_URL ?? "/") || "/";
    const base = rawBase.replace(/\/+$/, "");
    const p = location.pathname;

    const pick = (name: string) => `${base}/backgrounds/${name}`;

    if (p.includes("/app/house")) return pick("bg-house.png");
    if (p.includes("/app/materials")) return pick("bg-materials.png");
    if (p.includes("/app/settings")) return pick("bg-settings.png");
    if (p.includes("/app/quotes") || p.includes("/app/invoices") || p.includes("/app/print")) return pick("bg-docs.png");
    if (p.includes("/app/menu")) return pick("bg-menu.png");
    // projects + calculators + calculator wrapper
    if (p.includes("/app/projects") || p.includes("/app/calculators") || p.includes("/app/calculator")) return pick("bg-projects.png");
    return pick("bg-menu.png");
  }, [location.pathname]);

  const currentTab = location.pathname.startsWith("/app/menu")
    ? "menu"
    : location.pathname.includes("settings")
      ? "settings"
      : location.pathname.includes("house") || location.pathname.includes("quotes") || location.pathname.includes("invoices")
        ? "house"
        : location.pathname.includes("projects") || location.pathname.includes("calculators")
          ? "projects"
          : location.pathname.includes("materials")
            ? "materials"
            : "projects";

  const handleNavChange = (tab: string) => {
    setCurrentCalc(null);

    if (tab === "menu") navigate("/app/menu");
    if (tab === "projects") navigate("/app/projects");
    if (tab === "house") navigate("/app/house");
    if (tab === "materials") navigate("/app/materials");
    if (tab === "settings") navigate("/app/settings");
  };

  // ✅ /app/calculators?calc=... -> opens calculator (safe)
  useEffect(() => {
    if (location.pathname !== "/app/calculators") return;
    const sp = new URLSearchParams(location.search);
    const resolved = resolveCalcFromParam(sp.get("calc"));
    if (resolved) setCurrentCalc(resolved);
  }, [location.pathname, location.search]);

  if (currentCalc) {
    return (
      <Suspense
        fallback={
          <div className="h-screen bg-slate-50 flex items-center justify-center">
            <PageLoader />
          </div>
        }
      >
        <CalculatorPage
          type={currentCalc}
          onBack={() => setCurrentCalc(null)}
          onNavigateProjects={() => {
            setCurrentCalc(null);
            navigate("/app/projects");
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="app-bg min-h-screen relative">
      {/* background layers */}
      <div className="app-bg__image" style={{ backgroundImage: `url('${bgUrl}')` }} aria-hidden="true" />
      <div className="app-bg__veil" aria-hidden="true" />

      {/* content */}
      <div className="relative z-10">
        <Outlet context={{ setCurrentCalc }} />
      </div>

      <BottomNav currentTab={currentTab} onChange={handleNavChange} />
    </div>
  );
};

// --- Simple 404 ---
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-slate-900">
        {t("notfound.title", { defaultValue: "Page not found" })}
      </h1>
      <p className="mt-3 text-slate-600">
        {t("notfound.description", { defaultValue: "This page doesn’t exist." })}
      </p>
      <Link to="/app/projects" className="inline-flex mt-6 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold">
        {t("notfound.go_to_app", { defaultValue: "Go to app" })}
      </Link>
    </div>
  );
};

// --- 3. Main Router ---
const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <ErrorBoundary>
        <Routes>
          {/* Root -> Application */}
          <Route path="/" element={<Navigate to="/app" replace />} />

          {/* App zone */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="calculators" element={<DashboardOutlet />} />
            <Route path="menu" element={<AppMenuPage />} />
            <Route path="house" element={<HouseProjectPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="calculator" element={<ProjectCalculatorWrapper />} />
            <Route path="quotes/:id" element={<QuoteEditorPage />} />
            <Route path="invoices/:id" element={<InvoiceEditorPage />} />
          </Route>

          {/* Print */}
          <Route path="/app/print/:type/:id" element={<PrintDocumentPage />} />

          {/* Redirects */}
          <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

// ✅ DashboardOutlet: reads ?calc= and opens calculator via context
const DashboardOutlet = () => {
  const { setCurrentCalc } = useOutletContext<{ setCurrentCalc: (t: CalculatorType) => void }>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const resolved = resolveCalcFromParam(searchParams.get("calc"));
    if (!resolved) return;

    setCurrentCalc(resolved);

    // clean URL after opening
    const next = new URLSearchParams(searchParams);
    next.delete("calc");
    setSearchParams(next, { replace: true });
  }, [searchParams, setCurrentCalc, setSearchParams]);

  return <DashboardPage onSelectCalc={setCurrentCalc} />;
};

export default App;