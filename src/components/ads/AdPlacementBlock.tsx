import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import AdSlot, { type AdSlotVariant } from "./AdSlot";
import { AD_CONFIG, getAdUnitId } from "../../config/adsConfig";
import { getAdRenderState, hideBanner, showBanner } from "../../services/adsService";
import type { AdPlacement, AdSlotRenderState } from "../../types/ads";

interface AdPlacementBlockProps {
  placement: Extract<AdPlacement, "dashboard_banner" | "calculator_result_banner">;
  variant?: AdSlotVariant;
  minHeight?: number;
  className?: string;
}

const defaultRenderState = (pathname: string, placement: AdPlacement): AdSlotRenderState =>
  getAdRenderState(pathname, placement);

export const AdPlacementBlock: React.FC<AdPlacementBlockProps> = ({
  placement,
  variant = "banner",
  minHeight,
  className,
}) => {
  const location = useLocation();
  const pathname = location.pathname || "/";

  const [renderState, setRenderState] = useState<AdSlotRenderState>(() =>
    defaultRenderState(pathname, placement)
  );

  const slotId = useMemo(() => getAdUnitId(placement), [placement]);

  useEffect(() => {
    setRenderState(defaultRenderState(pathname, placement));
  }, [pathname, placement]);

  useEffect(() => {
    const refresh = () => setRenderState(defaultRenderState(pathname, placement));

    window.addEventListener("consent-updated", refresh);
    window.addEventListener("batiquant-native-privacy", refresh as EventListener);

    return () => {
      window.removeEventListener("consent-updated", refresh);
      window.removeEventListener("batiquant-native-privacy", refresh as EventListener);
    };
  }, [pathname, placement]);

  useEffect(() => {
    if (!renderState.shouldRender || renderState.showPlaceholder) return;

    let cancelled = false;

    const run = async () => {
      const shown = await showBanner(placement);
      if (!shown && !cancelled) {
        setRenderState((current) => ({
          ...current,
          showPlaceholder: AD_CONFIG.ENABLE_WEB_PLACEHOLDERS,
          reason: "mobile-bridge-missing",
        }));
      }
    };

    void run();

    return () => {
      cancelled = true;
      void hideBanner(placement);
    };
  }, [placement, renderState.shouldRender, renderState.showPlaceholder]);

  if (!renderState.shouldRender) return null;

  if (!renderState.showPlaceholder) {
    return null;
  }

  return (
    <AdSlot
      slotId={slotId}
      variant={variant}
      minHeight={minHeight}
      className={className}
      showPlaceholder
    />
  );
};

export default AdPlacementBlock;
