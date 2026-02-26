
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-3xl mx-auto p-4 sm:p-6 pb-24 ${className}`}>
      {children}
    </div>
  );
};
