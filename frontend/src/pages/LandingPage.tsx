import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Sparkles, CheckCircle2, Star, ShieldCheck, 
  Zap, Tractor, Bot, Wheat, Droplets, Milk, Sprout,
  ArrowRight, Filter, ChevronRight, Phone, PhoneCall, DollarSign, Award,
  Briefcase, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  MOCK_JOB_CATEGORIES, 
  MOCK_TESTIMONIALS, 
  MOCK_METRICS,
  MOCK_FARMS_LOCATIONS
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getFeaturedWorkersApi } from '../services/profileService';
import { initiateMobileCall } from '../services/callService';
import type { WorkerProfile, ToastMessage } from '../types';

interface LandingPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Role-based visibility flags for Home page CTA buttons
  const userRole = (user?.role || '').trim().toUpperCase();
  const isFarmer = isAuthenticated && userRole === 'FARMER';
  const isWorker = isAuthenticated && userRole === 'WORKER';

  // Conditional CTA visibility:
  // - Unauthenticated: show both Hire Farm Workers & Find Farm Work
  // - Authenticated FARMER: show Hire Farm Workers only (hide Find Farm Work)
  // - Authenticated WORKER: show Find Farm Work only (hide Hire Farm Workers)
  // - Auth loading: wait for auth state to initialize before rendering
  const showHireButton = !isLoading && (!isAuthenticated || isFarmer);
  const showFindWorkButton = !isLoading && (!isAuthenticated || isWorker);

  // Click handler for "Hire Farm Workers" ensuring unauthenticated users are directed to login with destination preserved
  const handleHireWorkersClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate('/login', { state: { from: '/farmer/nearby-workers' } });
    }
  };

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Real Worker Profiles from MongoDB
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState<boolean>(true);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Fetch real featured workers from backend API
  const fetchFeaturedWorkers = async () => {
    setLoadingWorkers(true);
    setWorkerError(null);
    try {
      const data = await getFeaturedWorkersApi(6);
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load featured workers:', err);
      setWorkerError(err.message || 'Could not load verified workers.');
    } finally {
      setLoadingWorkers(false);
    }
  };

  useEffect(() => {
    fetchFeaturedWorkers();
  }, []);

  // Interactive Worker Detail Modal
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [isCallingWorker, setIsCallingWorker] = useState<boolean>(false);

  // Mobile calling action handler for modal
  const handleVoiceCallWorker = async () => {
    if (!selectedWorker) return;

    if (!isAuthenticated || !user) {
      const worker = selectedWorker;
      addToast({
        type: 'info',
        title: 'Sign In Required',
        message: `Please sign in as a Farmer to call ${worker.name}.`,
      });
      navigate('/login', {
        state: {
          from: window.location.pathname,
          action: 'call-worker',
          workerId: worker.id || worker._id,
          workerName: worker.name,
        },
      });
      return;
    }

    const role = (user.role || '').trim().toLowerCase();
    if (role !== 'farmer') {
      addToast({
        type: 'error',
        title: 'Farmer Access Required',
        message: 'Only Farmers can place voice calls to workers.',
      });
      return;
    }

    const workerId = selectedWorker.id || selectedWorker._id;
    if (!workerId) {
      addToast({
        type: 'warning',
        title: 'Worker Unavailable',
        message: 'Worker is currently unavailable for calling.',
      });
      return;
    }

    try {
      setIsCallingWorker(true);
      const res = await initiateMobileCall(workerId);
      addToast({
        type: 'success',
        title: 'Call Initiated',
        message: res.message || `Dialing ${selectedWorker.name}'s verified mobile number...`,
      });
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to initiate call. Please try again.';
      addToast({
        type: 'error',
        title: 'Calling Failed',
        message: errMsg,
      });
    } finally {
      setIsCallingWorker(false);
    }
  };

  // Hiring action handler for modal
  const handleConfirmHire = () => {
    if (!isAuthenticated || !user) {
      const worker = selectedWorker;
      setSelectedWorker(null);

      navigate('/login', {
        state: {
          from: '/farmer/applications',
          action: 'hire-worker',
          workerId: worker?.id,
          workerName: worker?.name,
        },
      });

      addToast({
        type: 'info',
        title: 'Sign In Required',
        message: `Please sign in to continue hiring ${worker?.name || 'this worker'}.`,
      });

      return;
    }

    const role = (user.role || '').trim().toLowerCase();

    if (role === 'admin') {
      addToast({
        type: 'info',
        title: 'Admin Access',
        message: 'Admin accounts cannot hire workers directly.',
      });
      return;
    }

    if (role !== 'farmer') {
      addToast({
        type: 'error',
        title: 'Farmer Access Required',
        message: 'Only Farmers can hire agricultural workers.',
      });
      return;
    }

    const workerName = selectedWorker?.name || 'worker';

    setSelectedWorker(null);

    navigate('/farmer/applications');

    addToast({
      type: 'success',
      title: 'Continue Hiring',
      message: `You are signed in as a Farmer. Continue hiring ${workerName} from your applications.`,
    });
  };

  // AgriMatch AI Interactive Widget State
  const [aiCrop, setAiCrop] = useState('Wheat Harvesting');
  const [aiLocation, setAiLocation] = useState('Punjab, India');
  const aiWorkersCount = 5;
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [aiResult, setAiResult] = useState<{
    matchedCount: number;
    score: number;
    estimatedArrival: string;
    workers: WorkerProfile[];
  } | null>(null);

  // Search submit handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'info',
      title: 'Searching Agricultural Talent',
      message: `Filtering workers for "${searchQuery || 'All Skills'}" in ${selectedLocation || 'All Locations'}`
    });
  };

  // Run AgriMatch AI Simulation
  const handleRunAiMatch = () => {
    setIsAiMatching(true);
    setAiResult(null);
    setTimeout(() => {
      setIsAiMatching(false);
      setAiResult({
        matchedCount: aiWorkersCount,
        score: 98.4,
        estimatedArrival: '1.5 Hours',
        workers: workers.length > 0 ? workers.slice(0, 3) : [],
      });
      addToast({
        type: 'success',
        title: 'AgriMatch AI Recommendation Ready!',
        message: `Found ${aiWorkersCount} top-rated workers matching your ${aiCrop} job.`
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col text-slate-800">
      <Navbar />

      {/* ------------------- HERO SECTION ------------------- */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-emerald-100/60 via-green-100/40 to-lime-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-agri-primary/10 rounded-full blur-2xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Platform Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-white border border-emerald-200/80 shadow-soft-sm px-4 py-1.5 rounded-full mb-6 cursor-pointer hover:border-agri-primary transition-colors"
          >
            <span className="flex h-2 w-2 rounded-full bg-agri-primary animate-pulse" />
            <span className="text-xs font-semibold text-agri-dark tracking-wide uppercase">
              🌱 The #1 AI-Powered Agricultural Talent Engine
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-agri-muted" />
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-heading text-agri-text tracking-tight leading-[1.15] max-w-4xl mx-auto"
          >
            Connecting Farmers with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-agri-primary via-emerald-600 to-agri-dark">
              Skilled Farm Talent Instantly
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            LinkedIn for Agriculture. Hire background-verified harvesters, tractor operators, drone pilots, and seasonal crews with AI precision matching.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 min-h-[52px]"
          >
            {isLoading ? (
              <div className="h-12 w-52 bg-slate-200/60 rounded-2xl animate-pulse" />
            ) : (
              <>
                {showHireButton && (
                  <Link
                    to="/farmer/nearby-workers"
                    onClick={handleHireWorkersClick}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<Tractor className="w-5 h-5" />}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="shadow-agri-glow"
                    >
                      Hire Farm Workers
                    </Button>
                  </Link>
                )}

                {showFindWorkButton && (
                  <Link
                    to="/jobs"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      leftIcon={<Briefcase className="w-5 h-5 text-agri-primary" />}
                    >
                      Find Farm Work
                    </Button>
                  </Link>
                )}
              </>
            )}
          </motion.div>

          {/* Live Metric Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-100/80 px-4 py-2 rounded-full border border-slate-200"
          >
            <Sparkles className="w-4 h-4 text-agri-primary animate-spin" />
            <span>Over <strong className="text-agri-text font-bold">12,400+ Farm Jobs</strong> successfully matched this month</span>
          </motion.div>

          {/* ------------------- SEARCH BAR WIDGET ------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <form
              onSubmit={handleSearch}
              className="glass-panel p-3 rounded-2xl sm:rounded-3xl shadow-soft-lg border border-emerald-100 flex flex-col md:flex-row items-center gap-3"
            >
              {/* Skill / Role Query */}
              <div className="flex-1 w-full flex items-center bg-white px-4 py-3 rounded-xl border border-slate-200 text-left space-x-3">
                <Search className="w-5 h-5 text-agri-primary shrink-0" />
                <input
                  type="text"
                  placeholder="Skill, crop type (e.g. Combine Operator, Wheat)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm outline-none placeholder-slate-400 bg-transparent text-slate-800"
                />
              </div>

              {/* Location Select */}
              <div className="w-full md:w-52 flex items-center bg-white px-3.5 py-3 rounded-xl border border-slate-200 text-left space-x-2">
                <MapPin className="w-4 h-4 text-agri-primary shrink-0" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full text-xs font-medium outline-none bg-transparent text-slate-700 cursor-pointer"
                >
                  <option value="">All Locations</option>
                  {MOCK_FARMS_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-52 flex items-center bg-white px-3.5 py-3 rounded-xl border border-slate-200 text-left space-x-2">
                <Filter className="w-4 h-4 text-agri-primary shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs font-medium outline-none bg-transparent text-slate-700 cursor-pointer"
                >
                  <option value="All Categories">All Categories</option>
                  {MOCK_JOB_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.title}>{cat.title}</option>
                  ))}
                </select>
              </div>

              {/* Submit Search */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full md:w-auto whitespace-nowrap"
                leftIcon={<Search className="w-4 h-4" />}
              >
                Search Workers
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ------------------- STATISTICS METRICS SECTION ------------------- */}
      <section className="py-12 bg-white border-y border-agri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {MOCK_METRICS.map((metric, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-agri-bg border border-slate-200/80 shadow-soft-sm hover:shadow-soft-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl sm:text-4xl font-extrabold font-heading text-agri-dark tracking-tight">
                    {metric.value}
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-agri-dark border border-emerald-200">
                    {metric.change}
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-agri-text font-heading">{metric.label}</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{metric.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------- CATEGORIES SECTION ------------------- */}
      <section id="categories" className="py-20 bg-agri-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="green" size="md" className="mb-3">
            Explore Categories
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-agri-text tracking-tight">
            Agricultural Specializations
          </h2>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto">
            From heavy machinery operators to certified drone pilots, find verified labor for every farming need.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_JOB_CATEGORIES.map((cat, idx) => {
              const getIcon = (name: string) => {
                switch(name) {
                  case 'Wheat': return <Wheat className="w-7 h-7 text-emerald-600" />;
                  case 'Tractor': return <Tractor className="w-7 h-7 text-emerald-600" />;
                  case 'Bot': return <Bot className="w-7 h-7 text-emerald-600" />;
                  case 'Droplets': return <Droplets className="w-7 h-7 text-emerald-600" />;
                  case 'Milk': return <Milk className="w-7 h-7 text-emerald-600" />;
                  default: return <Sprout className="w-7 h-7 text-emerald-600" />;
                }
              };

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                >
                  <Card className="p-6 text-left h-full flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {getIcon(cat.iconName)}
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {cat.activeJobsCount}+ Jobs Active
                        </span>
                      </div>

                      <h3 className="text-lg font-bold font-heading text-agri-text group-hover:text-agri-primary transition-colors">
                        {cat.title}
                      </h3>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        {cat.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {cat.popularSkills.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-agri-primary group-hover:translate-x-1 transition-transform">
                      <span>Browse {cat.title} Workers</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------- BENTO-GRID FEATURES SECTION ------------------- */}
      <section id="features" className="py-20 bg-white border-y border-agri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="green" size="md" className="mb-3">
              Why Choose AgriConnect
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-agri-text tracking-tight">
              Built for Modern Agriculture
            </h2>
            <p className="mt-3 text-slate-600 text-sm">
              We combine AI precision matching with bank-grade security and verified worker IDs to transform farm employment.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1 - AI Matching (Wide) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-agri-deep text-white text-left relative overflow-hidden shadow-soft-lg flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-80 h-80 bg-agri-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div>
                <Badge variant="dark" size="sm" className="bg-emerald-800 text-emerald-200 border-emerald-700 mb-4">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400" /> AgriMatch AI 2.0
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight leading-snug">
                  Smart Geolocation & Crop-Skill Matching
                </h3>
                <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-lg">
                  Our proprietary algorithm evaluates crop harvest cycles, field distance, equipment certifications, and weather forecast windows to deliver worker matches in under 2 hours.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-emerald-800/80 text-xs">
                <div className="flex items-center space-x-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-agri-primary" />
                  <span>99.2% Match Accuracy</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-agri-primary" />
                  <span>Weather-Aware Alerts</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-agri-primary" />
                  <span>Emergency Dispatch</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2 - Verified Profiles */}
            <div className="p-8 rounded-3xl bg-agri-bg border border-agri-border text-left shadow-soft-sm hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-agri-primary mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-heading text-agri-text">
                  100% Verified Profiles
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Every agricultural worker and farm owner passes government ID verification, background checks, and skill badge validations.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center space-x-2 text-xs text-agri-dark font-semibold">
                <Award className="w-4 h-4" />
                <span>Certified Skill Badges Included</span>
              </div>
            </div>

            {/* Bento Card 3 - Instant Daily Payouts */}
            <div className="p-8 rounded-3xl bg-agri-bg border border-agri-border text-left shadow-soft-sm hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-5">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-heading text-agri-text">
                  Instant Daily Payouts
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Workers receive guaranteed direct payments into their bank accounts upon digital job completion sign-off by farmers.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center space-x-2 text-xs text-slate-700 font-semibold">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Zero Transfer Fees for Workers</span>
              </div>
            </div>

            {/* Bento Card 4 - Seasonal Contracting (Wide) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-left shadow-soft-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <Badge variant="green" size="sm">
                  Seasonal & On-Demand
                </Badge>
                <h3 className="text-2xl font-bold font-heading text-agri-dark">
                  Flexible Contracting for Every Harvest Season
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                  Book single-day emergency harvesting crews or retain multi-week tractor teams with standardized digital contracts.
                </p>
              </div>

              <Link to="/register-farmer" className="shrink-0 w-full sm:w-auto">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Contracts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- INTERACTIVE AI SECTION ------------------- */}
      <section id="ai-engine" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left AI Description */}
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="dark" size="md" className="bg-emerald-950 text-emerald-400 border-emerald-800">
                <Sparkles className="w-4 h-4 mr-1 text-agri-primary" /> Live AI Engine Demo
              </Badge>

              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-snug">
                Experience AgriMatch AI in Action
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Test our real-time matching simulation. Select your farm’s crop requirement and location to see how AgriConnect instantly calculates optimal worker matches.
              </p>

              <div className="space-y-3 text-xs text-slate-300 pt-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-agri-primary" />
                  <span>Filters by machinery operator licenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-agri-primary" />
                  <span>Calculates travel distance & arrival ETA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-agri-primary" />
                  <span>Auto-verifies worker availability</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Trial Box */}
            <div className="lg:col-span-7">
              <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <h3 className="text-lg font-bold font-heading text-white mb-6 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-agri-primary" />
                  <span>Simulate Farm Job Matching</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Crop */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-400 block mb-1.5">
                      Select Farm Operation / Crop
                    </label>
                    <select
                      value={aiCrop}
                      onChange={(e) => setAiCrop(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-agri-primary"
                    >
                      <option value="Wheat Harvesting">Wheat Combine Harvesting</option>
                      <option value="Agri-Drone Spraying">Pesticide Agri-Drone Spraying</option>
                      <option value="Organic Greenhouse">Greenhouse Tomato Pickers</option>
                      <option value="Dairy Milking">Commercial Dairy Milking</option>
                    </select>
                  </div>

                  {/* Select Location */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-400 block mb-1.5">
                      Farm Location
                    </label>
                    <select
                      value={aiLocation}
                      onChange={(e) => setAiLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-agri-primary"
                    >
                      {MOCK_FARMS_LOCATIONS.map((loc, idx) => (
                        <option key={idx} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-auto text-xs text-slate-400">
                    Target Crew Size: <strong className="text-white">{aiWorkersCount} Workers</strong>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleRunAiMatch}
                    isLoading={isAiMatching}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    className="w-full sm:w-auto"
                  >
                    Run AgriMatch AI Engine
                  </Button>
                </div>

                {/* AI Result Card */}
                {aiResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-left space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-emerald-800/80 pb-2">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> AI Recommendation Generated
                      </span>
                      <span className="text-emerald-200">
                        Score: <strong>{aiResult.score}% Match</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-200">
                      Found <strong>{aiResult.matchedCount} verified workers</strong> near {aiLocation} with proven experience in {aiCrop}. Estimated dispatch ETA: <strong className="text-agri-light">{aiResult.estimatedArrival}</strong>.
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      {aiResult.workers.map((w) => (
                        w.avatar || w.profileImage ? (
                          <img
                            key={w.id}
                            src={w.avatar || w.profileImage}
                            alt={w.name}
                            className="w-8 h-8 rounded-full border-2 border-agri-primary object-cover"
                            title={w.name}
                          />
                        ) : (
                          <div
                            key={w.id}
                            className="w-8 h-8 rounded-full border-2 border-agri-primary bg-emerald-800 text-white font-bold text-xs flex items-center justify-center uppercase"
                            title={w.name}
                          >
                            {w.name.charAt(0)}
                          </div>
                        )
                      ))}
                      <span className="text-[11px] text-emerald-300 font-medium pl-2">
                        Ready for instant booking
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- FEATURED WORKER CARDS SECTION ------------------- */}
      <section id="top-workers" className="py-20 bg-agri-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="green" size="md" className="mb-3">
            Top Agricultural Talent
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-agri-text tracking-tight">
            Featured Verified Workers
          </h2>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto">
            Browse rated professionals available for immediate farm hiring.
          </p>

          {/* Loading Skeleton State */}
          {loadingWorkers && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft-sm space-y-4 animate-pulse text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                      </div>
                    </div>
                    <div className="w-10 h-4 bg-slate-100 rounded" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 bg-slate-100 rounded-md w-16" />
                    <div className="h-5 bg-slate-100 rounded-md w-20" />
                    <div className="h-5 bg-slate-100 rounded-md w-16" />
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-5 bg-slate-200 rounded w-20" />
                    <div className="h-8 bg-slate-200 rounded-xl w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loadingWorkers && workerError && (
            <div className="mt-12 py-12 px-6 text-center bg-rose-50/50 rounded-3xl border border-rose-200/80 shadow-soft-sm max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-rose-800 font-heading">
                Unable to load verified workers
              </h3>
              <p className="text-xs text-rose-600 mt-1">
                {workerError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFeaturedWorkers}
                className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loadingWorkers && !workerError && workers.length === 0 && (
            <div className="mt-12 py-12 px-6 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-agri-primary flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-heading">
                No verified workers available yet.
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Check back soon as new agricultural specialists and machinery operators join AgriConnect.
              </p>
            </div>
          )}

          {/* Real Worker Cards Grid */}
          {!loadingWorkers && !workerError && workers.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((worker) => (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="p-6 text-left flex flex-col justify-between h-full group">
                    <div>
                      {/* Worker Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {worker.avatar || worker.profileImage ? (
                              <img
                                src={worker.avatar || worker.profileImage}
                                alt={worker.name}
                                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-200 group-hover:border-agri-primary transition-colors"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-agri-primary font-bold text-lg flex items-center justify-center border-2 border-emerald-200 group-hover:border-agri-primary transition-colors uppercase">
                                {worker.name.charAt(0)}
                              </div>
                            )}
                            {worker.isVerified && (
                              <div className="absolute -bottom-1 -right-1 bg-agri-primary text-white p-0.5 rounded-full" title="Verified Worker">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold font-heading text-base text-agri-text group-hover:text-agri-primary transition-colors">
                              {worker.name}
                            </h3>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-agri-primary" />
                              <span>{worker.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{(worker.rating || 5.0).toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">({worker.completedJobs ?? worker.totalJobsCompleted ?? worker.reviewsCount ?? 0} jobs)</span>
                        </div>
                      </div>

                      {/* Title & Badge */}
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-agri-dark font-heading">
                          {worker.title || 'Agricultural Specialist'}
                        </p>
                        {worker.badge && (
                          <div className="mt-2">
                            <Badge variant="amber" size="sm">
                              {worker.badge}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {worker.bio && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {worker.bio}
                        </p>
                      )}

                      {/* Skills Tags */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(worker.skills || []).map((skill, sIdx) => (
                          <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-agri-dark border border-emerald-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Expected Wage</span>
                        <span className="text-base font-extrabold font-heading text-agri-text">
                          ₹{worker.dailyWage ?? worker.expectedDailyWage ?? 0}<span className="text-xs font-normal text-slate-500"> / day</span>
                        </span>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedWorker(worker)}
                      >
                        Quick Hire
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------- TESTIMONIALS SECTION ------------------- */}
      <section id="testimonials" className="py-20 bg-white border-t border-agri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="green" size="md" className="mb-3">
            Real Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-agri-text tracking-tight">
            Trusted by Farmers & Workers Nationwide
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {MOCK_TESTIMONIALS.map((test) => (
              <Card key={test.id} className="p-6 flex flex-col justify-between h-full bg-slate-50/50">
                <div>
                  <div className="flex items-center space-x-1 text-amber-400 mb-3">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{test.content}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center space-x-3">
                  <img
                    src={test.avatar}
                    alt={test.name}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                  />
                  <div>
                    <h4 className="text-sm font-bold font-heading text-agri-text">{test.name}</h4>
                    <p className="text-[11px] text-slate-500">{test.farmOrLocation}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------- CALL TO ACTION BANNER ------------------- */}
      <section className="py-20 bg-gradient-to-br from-agri-dark via-agri-primary to-agri-deep text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge variant="dark" size="md" className="bg-emerald-950 text-emerald-300 border-emerald-700 mb-4">
            Get Started Today
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to Revolutionize Your Farm Operations?
          </h2>
          <p className="mt-4 text-slate-200 text-base max-w-xl mx-auto">
            Join thousands of commercial farmers and skilled agricultural workers today on AgriConnect.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register-farmer" className="w-full sm:w-auto">
              <Button variant="dark" size="lg" fullWidth leftIcon={<Tractor className="w-5 h-5" />}>
                Register as Farmer
              </Button>
            </Link>

            <Link to="/register-worker" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth leftIcon={<Briefcase className="w-5 h-5" />}>
                Register as Worker
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* WORKER QUICK HIRE MODAL */}
      <Modal
        isOpen={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
        title={selectedWorker ? `Hire ${selectedWorker.name}` : ''}
      >
        {selectedWorker && (
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
              {selectedWorker.avatar || selectedWorker.profileImage ? (
                <img
                  src={selectedWorker.avatar || selectedWorker.profileImage}
                  alt={selectedWorker.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-agri-primary"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-agri-primary font-bold text-2xl flex items-center justify-center border-2 border-agri-primary uppercase">
                  {selectedWorker.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-bold text-base text-agri-text font-heading">{selectedWorker.name}</h4>
                  {selectedWorker.isVerified && (
                    <span title="Verified Worker">
                      <CheckCircle2 className="w-4 h-4 text-agri-primary shrink-0" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{selectedWorker.title || 'Agricultural Specialist'}</p>
                <div className="flex items-center space-x-2 text-xs font-semibold text-agri-dark mt-1">
                  <span>₹{selectedWorker.dailyWage ?? selectedWorker.expectedDailyWage ?? 0} / day</span>
                  <span>•</span>
                  <span>{selectedWorker.location}</span>
                </div>
              </div>
            </div>

            {selectedWorker.skills && selectedWorker.skills.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Primary Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorker.skills.map((s, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-emerald-100 text-agri-dark font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedWorker.bio && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">About Worker</label>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedWorker.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Experience</span>
                <span className="font-bold text-slate-800 block">{selectedWorker.experience ?? selectedWorker.experienceYears ?? 0} Years</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Rating</span>
                <span className="font-bold text-amber-500 flex items-center justify-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{(selectedWorker.rating || 5.0).toFixed(1)}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Completed Jobs</span>
                <span className="font-bold text-slate-800 block">{selectedWorker.completedJobs ?? selectedWorker.totalJobsCompleted ?? selectedWorker.reviewsCount ?? 0}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 sm:gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setSelectedWorker(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                leftIcon={<Phone className="w-4 h-4" />}
                onClick={handleVoiceCallWorker}
                disabled={isCallingWorker || (!selectedWorker.ownerId && !selectedWorker._id && !selectedWorker.id)}
                isLoading={isCallingWorker}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isCallingWorker ? 'Calling...' : 'Call'}
              </Button>
              <Button
                variant="dark"
                fullWidth
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleConfirmHire}
              >
                Confirm Hire
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
