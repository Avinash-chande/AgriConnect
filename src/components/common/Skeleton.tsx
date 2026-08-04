import React from 'react';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`rounded-xl skeleton-shimmer bg-slate-200/80 ${className}`}
    />
  );
};
