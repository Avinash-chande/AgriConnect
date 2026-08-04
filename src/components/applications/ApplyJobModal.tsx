import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Calendar,
  IndianRupee,
  AlertCircle,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { applyForJob } from '../../services/applicationService';
import { applyJobSchema, ApplyJobFormValues } from '../../validators/applicationValidator';
import type { JobApplication, ApplyJobPayload } from '../../types/application';
import type { JobData } from '../../services/jobService';

interface ApplyJobModalProps {
  job: JobData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (application: JobApplication) => void;
}

export const ApplyJobModal: React.FC<ApplyJobModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplyJobFormValues>({
    resolver: zodResolver(applyJobSchema),
    defaultValues: {
      coverLetter: '',
      expectedJoiningDate: '',
      expectedDailyWage: job?.dailyWage || undefined,
      notes: '',
    },
  });

  if (!isOpen || !job) return null;

  const onSubmit = async (data: ApplyJobFormValues) => {
    try {
      setServerError(null);

      const payload: ApplyJobPayload = {
        coverLetter: data.coverLetter.trim(),
        expectedJoiningDate: data.expectedJoiningDate || undefined,
        expectedDailyWage: data.expectedDailyWage ? Number(data.expectedDailyWage) : undefined,
        notes: data.notes?.trim() || undefined,
      };

      const jobId = job._id || (job as any).id;
      const result = await applyForJob(jobId, payload);

      onSuccess(result);
      reset();
      onClose();
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || err.message || 'Failed to submit job application'
      );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
        >
          {/* Header Strip */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black leading-tight">Apply for Job</h2>
                <p className="text-xs text-emerald-100 truncate max-w-xs">{job.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Job Quick Recap */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>{job.category}</span>
            </div>
            {job.dailyWage && (
              <div className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>₹{job.dailyWage}/day offered</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Server Error Banner */}
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </motion.div>
            )}

            {/* Cover Letter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Cover Letter / Proposal <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                {...register('coverLetter')}
                placeholder="Describe your relevant experience, machinery skills, or why you're a great fit for this farm job..."
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none ${
                  errors.coverLetter
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                }`}
              />
              {errors.coverLetter && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {errors.coverLetter.message}
                </p>
              )}
            </div>

            {/* Expected Daily Wage & Expected Joining Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Expected Daily Wage (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    {...register('expectedDailyWage', { valueAsNumber: true })}
                    placeholder={job.dailyWage ? String(job.dailyWage) : 'e.g. 700'}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                      errors.expectedDailyWage
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {errors.expectedDailyWage && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {errors.expectedDailyWage.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Expected Joining Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('expectedJoiningDate')}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                      errors.expectedJoiningDate
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {errors.expectedJoiningDate && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {errors.expectedJoiningDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Additional Notes / Accommodations (Optional)
              </label>
              <input
                type="text"
                {...register('notes')}
                placeholder="e.g. Bringing personal harvesting tools, available for overtime..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {errors.notes && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
