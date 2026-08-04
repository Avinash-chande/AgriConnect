import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => {
  return (
    <div className={`bg-slate-200/80 animate-pulse rounded-xl ${className}`} />
  );
};

export const ProfileCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-soft-sm text-left">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-20 h-20 rounded-3xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex space-x-2 pt-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
};
