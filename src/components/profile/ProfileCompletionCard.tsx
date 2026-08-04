import React from 'react';
import { AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileCompletionCardProps {
  percentage: number;
  missingFields?: string[];
  onCompleteClick?: () => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  percentage = 65,
  missingFields = ['Add Farm Gallery Images', 'Select Equipment Owned', 'Set PIN Code'],
  onCompleteClick,
}) => {
  const isComplete = percentage >= 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-3xl p-6 sm:p-8 border shadow-soft-md text-left transition-all duration-300 relative overflow-hidden
        ${isComplete
          ? 'bg-gradient-to-br from-emerald-900 via-agri-dark to-slate-900 text-white border-emerald-700'
          : 'bg-white border-agri-border text-agri-text'
        }
      `}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        
        <div className="flex items-center space-x-5">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className={isComplete ? 'text-emerald-950' : 'text-slate-100'}
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                className={isComplete ? 'text-emerald-400' : 'text-agri-primary'}
                strokeDasharray={`${percentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                initial={{ strokeDasharray: '0, 100' }}
                animate={{ strokeDasharray: `${percentage}, 100` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className={`absolute text-lg font-extrabold font-heading ${isComplete ? 'text-white' : 'text-agri-text'}`}>
              {percentage}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold font-heading px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                isComplete 
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                  : 'bg-emerald-100 border-emerald-300 text-agri-dark'
              }`}>
                {isComplete ? 'Verified & Complete' : 'Profile Action Required'}
              </span>
            </div>

            <h3 className={`text-xl font-bold font-heading ${isComplete ? 'text-white' : 'text-agri-text'}`}>
              {isComplete ? 'Your Farmer Profile is Fully Optimized!' : 'Complete Your Farm Profile'}
            </h3>
            <p className={`text-xs sm:text-sm ${isComplete ? 'text-slate-300' : 'text-slate-500'}`}>
              {isComplete 
                ? 'Your farm listing is actively ranked at the top of worker searches & AI labor matching.' 
                : 'Complete at least 80% of your farm profile to unlock priority worker matching.'
              }
            </p>
          </div>
        </div>

        {!isComplete && (
          <button
            onClick={onCompleteClick}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover shadow-agri-glow transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Finish Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

      </div>

      {!isComplete && missingFields.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {missingFields.map((field, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-medium truncate">{field}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
