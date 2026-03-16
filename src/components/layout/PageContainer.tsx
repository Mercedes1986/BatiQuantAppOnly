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
          "glass-panel rounded-[26px] sm:rounded-[30px]",
          compactOnMobile ? "p-3 sm:p-5 lg:p-6" : "p-3.5 sm:p-5 lg:p-6",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
};
