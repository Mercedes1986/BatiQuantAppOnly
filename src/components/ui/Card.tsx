import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <section
      className={[
        'rounded-[28px] border border-white/70 bg-white/86 backdrop-blur-xl',
        'shadow-[0_18px_48px_rgba(15,23,42,0.08)] overflow-hidden',
        className,
      ].join(' ')}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/55 px-5 py-4 sm:px-6">
          {title ? (
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
};
