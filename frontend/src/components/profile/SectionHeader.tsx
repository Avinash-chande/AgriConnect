import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 ${className}`}>
      <div className="space-y-1 text-left">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-agri-primary">{icon}</span>}
          <h3 className="text-lg font-bold font-heading text-agri-text tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[10px] uppercase tracking-wider font-extrabold font-heading px-2 py-0.5 rounded-full bg-emerald-100 text-agri-dark border border-emerald-300">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
