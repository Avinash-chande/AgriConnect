import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { jobService } from '../../services/jobService';

interface DeleteJobModalProps {
  isOpen: boolean;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteJobModal: React.FC<DeleteJobModalProps> = ({
  isOpen,
  jobId,
  jobTitle,
  onClose,
  onSuccess,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await jobService.deleteJob(jobId);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete job posting.');
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Job Vacancy</h3>
            </div>
            <button
              onClick={onClose}
              disabled={deleting}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Content */}
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Warning:</span> This action will soft delete the job listing, un-list it from active search results, and remove associated uploaded gallery assets.
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete the job vacancy:
              <span className="block font-semibold text-white mt-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                "{jobTitle}"
              </span>
            </p>

            {error && (
              <p className="text-xs text-rose-400 font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
