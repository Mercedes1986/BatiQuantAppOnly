
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, className = '', children, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <select
          className={`w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-300' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
