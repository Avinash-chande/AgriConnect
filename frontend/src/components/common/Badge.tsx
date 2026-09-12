import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'dark' | 'amber' | 'blue' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'green',
  size = 'md',
  icon,
  className = ''
}) => {
  const variantStyles = {
    green: 'bg-agri-light text-agri-dark border-emerald-200/80',
    dark: 'bg-agri-dark text-white border-agri-dark',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-sky-50 text-sky-800 border-sky-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-semibold rounded-md',
    md: 'px-3 py-1 text-xs font-semibold rounded-full',
  };

  return (
    <span
      className={`
        inline-flex items-center space-x-1.5 border font-sans tracking-wide transition-all
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
