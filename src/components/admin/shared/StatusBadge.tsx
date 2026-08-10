import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  const normalized = status.toLowerCase();

  if (type === 'success' || ['active', 'verified', 'approved', 'hired', 'captured', 'processed', 'success', 'low'].includes(normalized)) {
    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (type === 'warning' || ['pending', 'in_review', 'xml_uploaded', 'open', 'medium'].includes(normalized)) {
    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (type === 'danger' || ['suspended', 'failed', 'rejected', 'closed', 'dismissed', 'high', 'critical'].includes(normalized)) {
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (type === 'info' || ['farmer', 'worker', 'admin', 'issued'].includes(normalized)) {
    badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono uppercase tracking-wider border ${badgeStyle}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
