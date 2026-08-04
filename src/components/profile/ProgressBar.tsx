import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  colorClass?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress = 75,
  label,
  showPercentage = true,
  colorClass,
  size = 'md',
  className = '',
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const defaultColor =
    normalizedProgress >= 80
      ? 'bg-agri-primary'
      : normalizedProgress >= 50
      ? 'bg-sky-500'
      : 'bg-amber-500';

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-700 font-heading">
          {label ? <span>{label}</span> : <div />}
          {showPercentage && <span>{normalizedProgress}%</span>}
        </div>
      )}

      <div className={`w-full bg-slate-200/80 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <motion.div
          className={`rounded-full ${heightClasses[size]} ${colorClass || defaultColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${normalizedProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
