import React from 'react';
import { Crown, Check } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size = 'md',
  showText = true,
}) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm ${padding}`}
      title="AgriConnect Verified Premium Member"
    >
      <Crown className={`${iconSize} fill-slate-950`} />
      {showText && <span>PRO</span>}
    </span>
  );
};

export default PremiumBadge;
