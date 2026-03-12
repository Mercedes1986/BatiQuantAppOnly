
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
      <input
        className={`w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
