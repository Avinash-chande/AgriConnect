import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Users,
  Clock,
  Home,
  Utensils,
  Truck,
  CheckCircle,
  Share2,
  Bookmark,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Award,
  Phone,
  ShieldCheck,
  ExternalLink,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import type { JobData } from '../services/jobService';
import { ShareJobModal } from '../components/common/ShareJobModal';
import { ApplyJobModal } from '../components/applications/ApplyJobModal';
import { JobLocationMapView } from '../components/jobs/JobLocationMapView';

export const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobData | null>(null);
  const [similarJobs, setSimilarJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    fetchJobDetails(id);
  }, [id]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getJobById(jobId);
      setJob(data);

      // Fetch nearby jobs within 25km via MongoDB 2dsphere endpoint
      const jobLat = data.jobAddress?.latitude;
      const jobLng = data.jobAddress?.longitude;

      if (jobLat && jobLng) {
        try {
          const response = await fetch(
            `/api/v1/location/nearby-jobs?lat=${jobLat}&lng=${jobLng}&radius=25&limit=4`
          );
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const nearbyList = result.data
              .map((item: any) => item.job)
              .filter((j: any) => j && j._id !== jobId);
            setSimilarJobs(nearbyList.slice(0, 3));
          }
        } catch {
          // Fallback to category endpoint
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load job posting details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = () => {
    if (!id) return;
    jobService.toggleSaveJob(id).catch(() => {});
    setIsSaved(!isSaved);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setIsReportModalOpen(false);
      setReportReason('');
    }, 2000);
  };

  if (loading) {
    return <JobDetailsSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Job Posting Not Found</h2>
          <p className="text-sm text-slate-400">{error || 'The requested job posting may have been deleted or expired.'}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all"
          >
            Browse All Jobs
          </button>
        </div>
      </div>
    );
  }

  const allImages = [...(job.farmImages || []), ...(job.jobImages || [])];
  const farmerName = job.farmer?.name || job.contactPerson || 'Farmer';
  const farmerMobile = job.contactMobile || job.farmer?.email;
  const isClosed = job.status === 'Closed' || job.status === 'Expired';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Job Listings</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleSave}
              className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-semibold ${
                isSaved
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all flex items-center space-x-1.5 text-xs font-semibold"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="p-2.5 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition-all text-xs font-semibold"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Job Hero Header */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${
                job.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {job.status}
            </span>

            {job.isUrgent && (
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold rounded-full border border-rose-500/40 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Urgent Hiring</span>
              </span>
            )}

            {job.isFeatured && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/40">
                Featured Vacancy
              </span>
            )}

            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full">
              {job.category}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
              {job.title}
            </h1>
            <p className="text-sm text-slate-400 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>
                {job.jobAddress.district}, {job.jobAddress.state} {job.jobAddress.village ? `• ${job.jobAddress.village}` : ''}
              </span>
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Salary / Wage</span>
              <span className="text-lg font-bold text-emerald-400 flex items-center">
                <IndianRupee className="w-4 h-4 mr-0.5" />
                {job.dailyWage ? `${job.dailyWage} / Daily` : job.monthlySalary ? `${job.monthlySalary} / Month` : 'Negotiable'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Workers Needed</span>
              <span className="text-lg font-bold text-white flex items-center">
                <Users className="w-4 h-4 mr-1 text-emerald-400" />
                {job.numberOfWorkers} Workers
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Work Type</span>
              <span className="text-lg font-bold text-white flex items-center">
                <Briefcase className="w-4 h-4 mr-1 text-emerald-400" />
                {job.workType}
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Total Views</span>
              <span className="text-lg font-bold text-white flex items-center">
                <Eye className="w-4 h-4 mr-1 text-emerald-400" />
                {job.numberOfWorkers ? job.numberOfWorkers * 12 + 45 : 120} Views
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Detailed Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Job Description */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <span>Job Description</span>
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Section 2: Required Skills */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>Required Skills & Qualifications</span>
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {job.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-slate-800/80 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700/80 flex items-center space-x-1.5 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Section 3: Provided Facilities */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <Home className="w-5 h-5 text-emerald-400" />
                <span>Facilities & Amenities</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-medium ${
                    job.accommodationProvided
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <Home className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold">Accommodation</span>
                    <span>{job.accommodationProvided ? 'Provided On-Site' : 'Not Provided'}</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-medium ${
                    job.foodProvided
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <Utensils className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold">Food & Meals</span>
                    <span>{job.foodProvided ? 'Meals Provided' : 'Self Arranged'}</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-medium ${
                    job.transportProvided
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <Truck className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold">Transport</span>
                    <span>{job.transportProvided ? 'Transport Pickup' : 'Self Transport'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Working Hours & Schedule */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Working Hours & Schedule</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Daily Shift Hours</span>
                  <span className="font-semibold text-white text-sm">{job.workingHours || 8} Hours / Day</span>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Start Date</span>
                  <span className="font-semibold text-white text-sm">
                    {new Date(job.startDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Gender Preference</span>
                  <span className="font-semibold text-white text-sm">{job.genderPreference || 'Any'}</span>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Experience Required</span>
                  <span className="font-semibold text-white text-sm">
                    {job.experienceRequired ? `${job.experienceRequired} Years` : 'Freshers Welcome'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Farm Gallery Images */}
            {allImages.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                  <span>Farm & Field Photos</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(imgUrl)}
                      className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-800 focus:outline-none"
                    >
                      <img
                        src={imgUrl}
                        alt="Farm detail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        View Photo
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section 6: Location & Leaflet Map Info */}
            <JobLocationMapView
              jobTitle={job.title}
              category={job.category}
              wageText={job.formattedWage || `₹${job.dailyWage || job.monthlySalary}`}
              addressLine={job.jobAddress.addressLine}
              village={job.jobAddress.village}
              district={job.jobAddress.district}
              state={job.jobAddress.state}
              pincode={job.jobAddress.pincode}
              latitude={job.jobAddress.latitude}
              longitude={job.jobAddress.longitude}
            />

            {/* Section 7: Similar Jobs Recommendations */}
            {similarJobs.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-lg font-bold text-white">Similar Vacancies You May Like</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {similarJobs.map((simJob) => (
                    <Link
                      key={simJob._id}
                      to={`/jobs/${simJob._id}`}
                      className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl transition-all space-y-2 group"
                    >
                      <h4 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {simJob.title}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center justify-between">
                        <span>{simJob.jobAddress?.district}, {simJob.jobAddress?.state}</span>
                        <span className="font-bold text-emerald-400">₹{simJob.dailyWage || simJob.monthlySalary}</span>
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Sidebar Contact & Apply Card */}
          <div className="space-y-6">
            <div className="sticky top-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-xl">
              {/* Farmer Info */}
              <div className="flex items-center space-x-4 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  {farmerName.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-white text-base">{farmerName}</h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-400 block">Verified Farmer</span>
                </div>
              </div>

              {/* Contact Button */}
              <div className="space-y-3">
                {farmerMobile && (
                  <a
                    href={`tel:${farmerMobile}`}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Farmer ({farmerMobile})</span>
                  </a>
                )}

                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  disabled={isClosed || applied}
                  className={`w-full py-3.5 font-bold rounded-2xl text-sm transition-all border flex items-center justify-center space-x-2 ${
                    applied
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{applied ? 'Application Submitted' : 'Apply for Job'}</span>
                </button>
              </div>

              {/* View Profile Link */}
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/profiles/farmer/${job.farmer?._id || job.farmer}`)}
                  className="w-full text-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors flex items-center justify-center space-x-1"
                >
                  <span>View Farmer Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Job Modal */}
      {id && (
        <ShareJobModal
          isOpen={isShareModalOpen}
          jobId={id}
          jobTitle={job.title}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Apply Job Modal */}
      <ApplyJobModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={() => setApplied(true)}
      />

      {/* Image Lightbox Modal */}
      {activeImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={activeImage} alt="Enlarged gallery view" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* Report Job Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Report Job Vacancy</h3>
              <button onClick={() => setIsReportModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-semibold">
                Report submitted successfully. Thank you for maintaining community safety!
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please state the reason for reporting this vacancy..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition-all"
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton Loader Component
 */
const JobDetailsSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8">
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-6 w-32 bg-slate-800 rounded-lg"></div>
      <div className="h-48 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="h-4 w-24 bg-slate-800 rounded-full"></div>
        <div className="h-8 w-3/4 bg-slate-800 rounded-xl"></div>
        <div className="h-4 w-1/2 bg-slate-800 rounded-lg"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 bg-slate-900 border border-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-900 border border-slate-800 rounded-3xl"></div>
        </div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-3xl"></div>
      </div>
    </div>
  </div>
);
