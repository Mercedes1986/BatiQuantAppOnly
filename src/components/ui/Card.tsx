
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-white">
          {title && <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};