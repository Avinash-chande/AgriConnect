import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2, Undo2 } from 'lucide-react';
import { JobApplication } from '../../types/application';
import { withdrawApplication } from '../../services/applicationService';

interface WithdrawModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedApp: JobApplication) => void;
}

export const WithdrawApplicationModal: React.FC<WithdrawModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const handleWithdraw = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const updated = await withdrawApplication(application._id || application.id!);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to withdraw application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
            <div className="flex items-center space-x-2 text-amber-700 font-semibold text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Withdraw Application</span>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <h4 className="font-semibold text-slate-800 text-sm">
                {application.job?.title || 'Job Application'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Employer: <span className="font-medium text-slate-700">{application.farmer?.name || 'Farmer'}</span>
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to withdraw your application? This will notify the farmer and update the job’s application metrics.
            </p>

            {application.status === 'Hired' && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                ⚠️ Applications that have already been hired cannot be withdrawn.
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              Keep Application
            </button>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isSubmitting || application.status === 'Hired'}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 rounded-xl shadow-md shadow-red-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Withdrawing...</span>
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4" />
                  <span>Confirm Withdrawal</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
