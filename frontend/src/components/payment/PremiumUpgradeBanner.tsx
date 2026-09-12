import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';

interface PremiumUpgradeBannerProps {
  featureName: string;
  description?: string;
  compact?: boolean;
}

export const PremiumUpgradeBanner: React.FC<PremiumUpgradeBannerProps> = ({
  featureName,
  description,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-900/10 border border-amber-500/30 rounded-2xl">
        <div className="flex items-center gap-2 text-xs">
          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-slate-800">
            {featureName} is a Premium Pro feature
          </span>
        </div>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-lg transition shadow-sm"
        >
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            Premium Pro Feature
          </div>
          <h4 className="text-lg font-black text-white tracking-tight">
            Unlock {featureName}
          </h4>
          <p className="text-xs text-slate-300 max-w-md">
            {description ||
              `Upgrade your plan to access ${featureName}, priority placement, advanced AI recommendations, and farm analytics.`}
          </p>
        </div>

        <Link
          to="/pricing"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition transform hover:-translate-y-0.5 shrink-0"
        >
          <Crown className="w-4 h-4 text-slate-950" />
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
};

export default PremiumUpgradeBanner;
