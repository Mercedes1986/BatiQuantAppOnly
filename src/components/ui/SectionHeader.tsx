import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon: Icon }) => {
  return (
    <div className="mb-5 rounded-[24px] border border-white/75 bg-white/82 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
        </div>
      </div>
    </div>
  );
};
