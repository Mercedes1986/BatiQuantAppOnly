import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  compactOnMobile?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = "",
  compactOnMobile = false,
}) => {
  return (
    <div className={`page-narrow ${className}`}>
      <div
        className={[
          "glass-panel overflow-hidden rounded-[24px] sm:rounded-[28px]",
          compactOnMobile ? "p-3 sm:p-4 lg:p-5" : "p-3.5 sm:p-4 lg:p-5",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
};
