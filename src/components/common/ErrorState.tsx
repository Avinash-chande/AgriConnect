import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Profile Data',
  message = 'We encountered an error retrieving the profile information. Please check your internet connection or try again.',
  onRetry,
  showHomeLink = true,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-soft-sm space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-bold font-heading text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{message}</p>
      </div>

      <div className="flex items-center justify-center space-x-3 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 rounded-2xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover transition-colors shadow-sm flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}

        {showHomeLink && (
          <Link
            to="/"
            className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold font-heading text-xs hover:bg-slate-200 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back Home</span>
          </Link>
        )}
      </div>
    </div>
  );
};
