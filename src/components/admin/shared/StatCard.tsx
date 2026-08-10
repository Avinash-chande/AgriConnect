import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'red';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const colorMap = {
  emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
  blue: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
  purple: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-400',
  red: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald',
  trend,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold font-heading text-white mt-1.5">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>

        <div className={`p-3.5 rounded-xl bg-gradient-to-br border ${colorMap[color]} shadow-inner`}>
          <Icon size={24} />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center space-x-1.5 text-xs font-mono">
          <span className={trend.isPositive ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  );
};
