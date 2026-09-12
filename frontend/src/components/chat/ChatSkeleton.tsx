import React from 'react';

export const ChatSkeleton: React.FC = () => (
  <div className="p-4 space-y-4 animate-pulse">
    {/* Received Bubble Skeleton */}
    <div className="flex flex-col items-start max-w-[65%] space-y-1">
      <div className="h-12 bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none w-full" />
      <div className="h-2 bg-slate-800 rounded w-16" />
    </div>

    {/* Sent Bubble Skeleton */}
    <div className="flex flex-col items-end max-w-[65%] ml-auto space-y-1">
      <div className="h-10 bg-emerald-950/60 border border-emerald-800/40 rounded-2xl rounded-br-none w-full" />
      <div className="h-2 bg-slate-800 rounded w-12" />
    </div>

    {/* Received Bubble Skeleton */}
    <div className="flex flex-col items-start max-w-[70%] space-y-1">
      <div className="h-16 bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none w-full" />
      <div className="h-2 bg-slate-800 rounded w-16" />
    </div>

    {/* Sent Bubble Skeleton */}
    <div className="flex flex-col items-end max-w-[60%] ml-auto space-y-1">
      <div className="h-12 bg-emerald-950/60 border border-emerald-800/40 rounded-2xl rounded-br-none w-full" />
      <div className="h-2 bg-slate-800 rounded w-12" />
    </div>
  </div>
);
