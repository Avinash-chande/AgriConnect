import React from 'react';
import { Sprout, Check } from 'lucide-react';

interface CropBadgeProps {
  crop: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CropBadge: React.FC<CropBadgeProps> = ({
  crop,
  isSelected = false,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5
        ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${isSelected
          ? 'bg-agri-dark text-white border-agri-dark shadow-sm font-bold'
          : 'bg-emerald-50 text-emerald-950 border-emerald-300'
        }
        ${className}
      `}
    >
      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Sprout className="w-3.5 h-3.5 text-agri-primary shrink-0" />}
      <span>{crop}</span>
    </button>
  );
};
