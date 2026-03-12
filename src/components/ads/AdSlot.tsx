import React from "react";
import { useTranslation } from "react-i18next";

export type AdSlotVariant = "banner" | "inline" | "rectangle";

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

  const resolvedMinHeight = minHeight ?? (variant === "rectangle" ? 250 : variant === "inline" ? 96 : 72);

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
      aria-label={t("ads.placeholderLabel", "Advertising placeholder")}
      role="complementary"
    >
      <div className="flex h-full min-h-inherit items-center justify-center">
        <div>
          <div className="font-medium text-slate-600">
            {t("ads.placeholderTitle", "Reserved ad placement")}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {t(
              "ads.placeholderDescription",
              "This area is kept for future mobile ad integration.",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdSlot;
