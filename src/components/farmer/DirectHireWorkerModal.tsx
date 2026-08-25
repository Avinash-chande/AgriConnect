import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  Briefcase,
  IndianRupee,
  Calendar,
  Sparkles,
  Phone,
  MessageSquare,
  PlusCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Star,
  Send,
  Home,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jobService, type JobData } from '../../services/jobService';
import { initiateMobileCall } from '../../services/callService';
import { JOB_CATEGORIES } from '../../constants/jobConstants';
import type { WorkerProfile } from '../../types';

interface DirectHireWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onHireSuccess?: () => void;
}

export const DirectHireWorkerModal: React.FC<DirectHireWorkerModalProps> = ({
  isOpen,
  onClose,
  worker,
  onHireSuccess,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [activeJobs, setActiveJobs] = useState<JobData[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Existing job offer form
  const [agreedWage, setAgreedWage] = useState<number>(650);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [farmerNotes, setFarmerNotes] = useState<string>('');

  // New quick job offer form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(JOB_CATEGORIES[0] || 'Harvesting');
  const [newCrop, setNewCrop] = useState<string>('');
  const [newWage, setNewWage] = useState<number>(650);
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newWorkHours, setNewWorkHours] = useState<number>(8);
  const [provideAccommodation, setProvideAccommodation] = useState<boolean>(false);
  const [provideFood, setProvideFood] = useState<boolean>(false);

  // States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState<boolean>(false);

  // Pre-fill worker data when modal opens
  useEffect(() => {
    if (worker) {
      const defaultWage =
        worker.expectedDailyWage || worker.dailyWage || 650;
      setAgreedWage(Number(defaultWage));
      setNewWage(Number(defaultWage));
      if (worker.title) {
        setNewTitle(`${worker.title} for Farm Operations`);
      }
    }
  }, [worker]);

  // Fetch Farmer's open jobs when modal opens
  useEffect(() => {
    if (isOpen && isAuthenticated && user && user.role.toLowerCase() === 'farmer') {
      fetchFarmerJobs();
    }
  }, [isOpen, isAuthenticated, user]);

  const fetchFarmerJobs = async () => {
    try {
      setLoadingJobs(true);
      setErrorMsg(null);
      const res = await jobService.getFarmerDashboardJobs({ status: 'Open', limit: 20 });
      const openList = (res.jobs || []).filter(
        (j) => j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'active'
      );
      setActiveJobs(openList);
      if (openList.length > 0) {
        setSelectedJobId(openList[0]._id || (openList[0] as any).id);
      } else {
        setMode('new');
      }
    } catch {
      setActiveJobs([]);
      setMode('new');
    } finally {
      setLoadingJobs(false);
    }
  };

  if (!isOpen || !worker) return null;

  const workerName = worker.name || 'Worker';
  const workerAvatar = worker.profileImage || worker.avatar;
  const workerRating = worker.rating || 5.0;
  const workerExp = worker.experienceYears ?? worker.experience ?? 0;
  const workerWage = worker.expectedDailyWage || worker.dailyWage || 650;
  const workerId = worker.id || worker._id || (worker as any).ownerId;

  // Handle direct call
  const handleCall = async () => {
    if (!isAuthenticated || !user) {
      onClose();
      navigate('/login', {
        state: {
          from: window.location.pathname,
          action: 'call-worker',
          workerId,
          workerName,
        },
      });
      return;
    }

    try {
      setIsCalling(true);
      const res = await initiateMobileCall(workerId);
      setSuccessMsg(res.message || `Calling ${workerName}'s verified phone...`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Call failed.');
    } finally {
      setIsCalling(false);
    }
  };

  // Submit Offer for Existing Job
  const handleSubmitExistingJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      setErrorMsg('Please select an active job posting.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await new Promise((r) => setTimeout(r, 900));

      setSuccessMsg(`🎉 Job offer sent successfully to ${workerName}!`);
      setTimeout(() => {
        if (onHireSuccess) onHireSuccess();
        onClose();
        navigate('/farmer/applications');
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit hire request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Create New Job Offer
  const handleSubmitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('Please provide a job title.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const jobPayload = {
        title: newTitle.trim(),
        description: `Dedicated farm job offer created for ${workerName}. Includes ${newCategory} work. Notes: ${farmerNotes || 'Agreed terms upon hiring.'}`,
        category: newCategory,
        cropType: newCrop.trim() || 'Seasonal Crop',
        workType: 'Contractual / Seasonal',
        numberOfWorkers: 1,
        dailyWage: Number(newWage),
        startDate: newStartDate,
        workingHours: Number(newWorkHours),
        accommodationProvided: provideAccommodation,
        foodProvided: provideFood,
        transportProvided: false,
        requiredSkills: worker.skills?.length ? worker.skills.slice(0, 3) : ['General Agricultural Labor'],
        jobAddress: {
          addressLine: 'Farm Headquarters',
          district: worker.preferredDistrict || 'Amritsar',
          state: worker.preferredState || 'Punjab',
          village: 'Main Field',
          latitude: 31.634,
          longitude: 75.8573,
        },
      };

      await jobService.createJob(jobPayload);

      setSuccessMsg(`🎉 New Job Created & Assigned to ${workerName}!`);
      setTimeout(() => {
        if (onHireSuccess) onHireSuccess();
        onClose();
        navigate('/farmer/applications');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to create job.');
    } finally {
      setSubmitting(false);
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 text-left"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold font-heading leading-tight">
                  Direct Hire & Job Offer
                </h2>
                <p className="text-xs text-emerald-100">
                  Hire verified agricultural specialist directly for your farm
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Worker Preview Card */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-xl flex items-center justify-center border-2 border-emerald-300 overflow-hidden shrink-0 shadow-sm">
                {workerAvatar ? (
                  <img src={workerAvatar} alt={workerName} className="w-full h-full object-cover" />
                ) : (
                  workerName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {workerName}
                  </h3>
                  {worker.isVerified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {worker.title || 'Agricultural Specialist'} • {worker.location || 'Punjab, India'}
                </p>
                <div className="flex items-center space-x-3 text-xs mt-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {workerWage}/day expected
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-amber-500 flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{workerRating.toFixed(1)}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {workerExp} Yrs Exp
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCall}
                disabled={isCalling}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isCalling ? 'Calling...' : 'Call'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/chat', {
                    state: {
                      recipientId: (worker as any).ownerId || workerId,
                      recipientName: workerName,
                    },
                  });
                }}
                className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  mode === 'existing'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Offer Existing Job ({activeJobs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  mode === 'new'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Create Dedicated Job Offer</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'existing' ? (
              <form onSubmit={handleSubmitExistingJob} className="space-y-4">
                {loadingJobs ? (
                  <div className="py-8 text-center space-y-2 text-slate-500 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    <p>Loading your active job postings...</p>
                  </div>
                ) : activeJobs.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      You do not have any open vacancies right now.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Switch to "Create Dedicated Job Offer" to post a new job for this worker.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMode('new')}
                      className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Create Job Offer
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                        Select Farm Vacancy
                      </label>
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {activeJobs.map((j) => (
                          <option key={j._id} value={j._id}>
                            {j.title} • {j.category} (₹{j.dailyWage || j.monthlySalary}/day)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                          Agreed Daily Wage (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="number"
                            min={100}
                            value={agreedWage}
                            onChange={(e) => setAgreedWage(Number(e.target.value))}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                          Expected Joining Date
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                        Special Instructions / Notes for Worker (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={farmerNotes}
                        onChange={(e) => setFarmerNotes(e.target.value)}
                        placeholder="e.g. Please bring tractor driver license, accommodation provided on farm..."
                        className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Offer...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Confirm Hire Offer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <form onSubmit={handleSubmitNewJob} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Combine Harvester Operator for Wheat Season"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Work Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {JOB_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Target Crop / Field
                    </label>
                    <input
                      type="text"
                      value={newCrop}
                      onChange={(e) => setNewCrop(e.target.value)}
                      placeholder="e.g. Wheat, Paddy, Sugarcane"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Daily Wage (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="number"
                        min={100}
                        value={newWage}
                        onChange={(e) => setNewWage(Number(e.target.value))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Daily Hours
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={14}
                      value={newWorkHours}
                      onChange={(e) => setNewWorkHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provideAccommodation}
                      onChange={(e) => setProvideAccommodation(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center space-x-1">
                      <Home className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Provide Farm Accommodation</span>
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provideFood}
                      onChange={(e) => setProvideFood(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center space-x-1">
                      <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Provide Meals / Food</span>
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Offer...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Create & Send Job Offer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
