import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface ProfileStrengthProps {
  percentage: number;
  missingItems?: string[];
  onActionClick?: () => void;
  className?: string;
}

export const ProfileStrength: React.FC<ProfileStrengthProps> = ({
  percentage = 75,
  missingItems = ['Upload Farm Gallery Photos', 'Add Secondary Contact Number'],
  onActionClick,
  className = '',
}) => {
  const isOptimal = percentage >= 80;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-6 text-left space-y-4 shadow-soft-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-agri-primary" />
          <h4 className="text-sm font-bold font-heading text-slate-900">Profile Completion Strength</h4>
        </div>

        <span className={`text-xs font-bold font-heading px-2.5 py-0.5 rounded-full border ${
          isOptimal ? 'bg-emerald-100 text-agri-dark border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
        }`}>
          {isOptimal ? 'Optimal' : 'Action Required'}
        </span>
      </div>

      <ProgressBar progress={percentage} showPercentage />

      {!isOptimal && missingItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Suggested Enhancements:</p>
          <div className="space-y-1.5">
            {missingItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{item}</span>
                </span>
                {onActionClick && (
                  <button onClick={onActionClick} className="text-[11px] font-bold text-agri-primary hover:underline">
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
