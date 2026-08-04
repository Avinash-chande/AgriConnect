import React from 'react';
import { Wrench, Check } from 'lucide-react';

interface SkillBadgeProps {
  skill: string;
  isSelected?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({
  skill,
  isSelected = false,
  onClick,
  variant = 'primary',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5
        ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${isSelected
          ? 'bg-agri-primary text-white border-agri-primary shadow-sm font-bold'
          : variant === 'secondary'
          ? 'bg-slate-100 text-slate-800 border-slate-200'
          : 'bg-emerald-50/80 text-agri-dark border-emerald-200'
        }
        ${className}
      `}
    >
      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5 text-agri-primary shrink-0" />}
      <span>{skill}</span>
    </button>
  );
};
