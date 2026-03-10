import React from "react";
import { useTranslation } from "react-i18next";

export type AdSlotVariant = "banner" | "inline" | "rectangle" | "safe";

interface AdSlotProps {
  slotId?: string;
  format?: string;
  className?: string;
  variant?: AdSlotVariant;
  minHeight?: number;
  showPlaceholder?: boolean;
}

const variantClassMap: Record<AdSlotVariant, string> = {
  banner: "min-h-[72px]",
  inline: "min-h-[96px]",
  rectangle: "min-h-[250px]",
  safe: "min-h-[180px]",
};

export function AdSlot({
  slotId,
  format,
  className = "",
  variant = "banner",
  minHeight,
  showPlaceholder = true,
}: AdSlotProps) {
  const { t } = useTranslation();

  if (!showPlaceholder) {
    return null;
  }

  const resolvedMinHeight =
    minHeight ??
    (variant === "rectangle" ? 250 : variant === "inline" ? 96 : variant === "safe" ? 180 : 72);

  return (
    <div
      className={[
        "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-500",
        variantClassMap[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ minHeight: resolvedMinHeight }}
      data-slot-id={slotId}
      data-format={format}
      data-ad-platform="mobile-ready-placeholder"
      aria-label={t("ads.label", { defaultValue: "Advertisement" })}
      role="complementary"
    >
      <div className="flex h-full items-center justify-center">
        <div>
          <div className="font-medium text-slate-600">
            {t("ads.placeholder_title", { defaultValue: "Reserved mobile ad slot" })}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {t("ads.placeholder_text", {
              defaultValue: "Web ads are disabled in this codebase. AdMob must be wired in the native Android/iOS layer.",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdSlot;
