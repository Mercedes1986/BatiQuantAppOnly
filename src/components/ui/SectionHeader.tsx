import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon: Icon }) => {
  return (
    <div className="flex items-start space-x-3 mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
      {Icon && (
        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
          <Icon size={20} />
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
};
