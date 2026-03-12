import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = "", ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-2xl border border-white/70 bg-white/88 px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};
