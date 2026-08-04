import React from 'react';
import { motion } from 'framer-motion';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3 animate-pulse"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
            <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-lg w-2/3" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
        </div>
        <div className="flex gap-4 pt-1">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-32" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
    <div className="h-12 bg-slate-100 dark:bg-slate-800/60 w-full" />
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/8" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/12" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl w-full" />
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  </div>
);
