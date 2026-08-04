import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading data. Please try again.',
  onRetry,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-3xl p-8 text-center space-y-3 max-w-md mx-auto my-8"
  >
    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
      <AlertCircle className="w-6 h-6" />
    </div>

    <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>

    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-rose-600/30"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Try Again
      </button>
    )}
  </motion.div>
);
