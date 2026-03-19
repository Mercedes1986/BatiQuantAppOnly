import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`page-narrow ${className}`}>
      <div className="glass-panel rounded-[30px] p-4 sm:p-5 lg:p-6">{children}</div>
    </div>
  );
};
