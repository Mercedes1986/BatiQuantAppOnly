import React from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, className = "", children, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-2xl border border-white/70 bg-white/88 px-4 py-3 pr-10 text-sm font-medium text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};
