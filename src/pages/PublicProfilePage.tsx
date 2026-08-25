import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  ShieldCheck,
  Tractor,
  Briefcase,
  Phone,
  ArrowLeft,
  Star,
  IndianRupee,
  Calendar,
  Sparkles,
  MessageSquare,
  Award,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { getProfileByIdOrSlugApi } from '../services/profileService';
import { initiateMobileCall } from '../services/callService';
import { DirectHireWorkerModal } from '../components/farmer/DirectHireWorkerModal';
import { ProfileCardSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';
import { SEO } from '../components/common/SEO';
import { useAuth } from '../context/AuthContext';
import type { WorkerProfile } from '../types';

export const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isHireModalOpen, setIsHireModalOpen] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callFeedback, setCallFeedback] = useState<string | null>(null);

  const loadPublicProfile = async () => {
    if (!identifier) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getProfileByIdOrSlugApi(identifier);
      if (response.data?.profile) {
        setProfileData(response.data.profile);
      }
    } catch (err: any) {
      setError(err.message || 'Requested profile was not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPublicProfile();
  }, [identifier]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full" aria-busy="true">
          <ProfileCardSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          <ErrorState title="Profile Not Found" message={error || 'Requested public profile does not exist.'} />
        </main>
        <Footer />
      </div>
    );
  }

  const owner = profileData.owner || {};
  const isFarmer = owner.role === 'Farmer';
  const pageTitle = isFarmer ? profileData.farmName : `${owner.name} - ${profileData.title || 'Agricultural Specialist'}`;
  const pageDescription = profileData.farmDescription || profileData.bio || `Connect with ${owner.name} on AgriConnect for agricultural employment and farming operations in India.`;

  const workerDailyWage = profileData.expectedDailyWage || profileData.dailyWage || 650;
  const workerRating = profileData.rating || 5.0;
  const workerExp = profileData.experienceYears ?? profileData.experience ?? 0;
  const workerSkills = profileData.skills || [];

  const mappedWorkerForModal: WorkerProfile = {
    id: profileData._id || owner._id,
    _id: profileData._id || owner._id,
    ownerId: owner._id || profileData.ownerId,
    name: owner.name || 'Worker',
    title: profileData.title || 'Agricultural Specialist',
    skills: workerSkills,
    experience: workerExp,
    experienceYears: workerExp,
    dailyWage: workerDailyWage,
    expectedDailyWage: workerDailyWage,
    rating: workerRating,
    location: `${profileData.preferredDistrict || ''}, ${profileData.preferredState || ''}`,
    profileImage: owner.profileImage,
    avatar: owner.profileImage,
    isVerified: owner.isVerified,
    availability: profileData.availability || 'Immediate',
    bio: profileData.bio || '',
  };

  const handleVoiceCall = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          action: 'call-worker',
          workerId: profileData._id || owner._id,
          workerName: owner.name,
        },
      });
      return;
    }

    try {
      setIsCalling(true);
      setCallFeedback(null);
      const res = await initiateMobileCall(owner._id || profileData._id);
      setCallFeedback(res.message || `Dialing ${owner.name}'s verified mobile number...`);
    } catch (err: any) {
      setCallFeedback(err.response?.data?.message || err.message || 'Call failed.');
    } finally {
      setIsCalling(false);
    }
  };

  const jsonLdData = isFarmer
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: profileData.farmName,
        description: profileData.farmDescription,
        address: {
          '@type': 'PostalAddress',
          addressLocality: profileData.farmAddress?.district,
          addressRegion: profileData.farmAddress?.state,
          addressCountry: 'IN',
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: owner.name,
        jobTitle: profileData.title || 'Agricultural Specialist',
        description: profileData.bio,
        knowsAbout: profileData.skills || [],
      };

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
      <SEO
        title={pageTitle}
        description={pageDescription}
        image={owner.profileImage || profileData.farmImages?.[0]}
        type={isFarmer ? 'business' : 'profile'}
        jsonLd={jsonLdData}
      />

      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full" id="main-content">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={isFarmer ? "/jobs" : "/farmer/nearby-workers"}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-agri-primary focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-md px-1 py-0.5 transition-colors"
            aria-label="Return to listings"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isFarmer ? 'Back to Job Feed' : 'Back to Nearby Workers'}</span>
          </Link>

          {!isFarmer && (
            <Link
              to="/farmer/nearby-workers"
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Browse More Workers
            </Link>
          )}
        </div>

        {callFeedback && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{callFeedback}</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-agri-border dark:border-slate-800 shadow-soft-lg p-6 sm:p-10 text-left space-y-8"
        >
          {/* Header Card */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-emerald-100 text-agri-primary flex items-center justify-center border-2 border-agri-primary/30 shrink-0 shadow-md">
                {owner.profileImage ? (
                  <img
                    src={owner.profileImage}
                    alt={`${owner.name}'s profile photo`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <User className="w-12 h-12" aria-hidden="true" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-agri-dark border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-agri-primary" aria-hidden="true" />
                  <span>Verified {owner.role} Listing</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
                  {isFarmer ? profileData.farmName : owner.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center justify-center md:justify-start space-x-2">
                  {isFarmer ? (
                    <Tractor className="w-4 h-4 text-agri-primary shrink-0" aria-hidden="true" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-agri-primary shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {isFarmer
                      ? `${profileData.farmSize || 25} ${profileData.farmSizeUnit || 'Acres'} (${profileData.irrigationType || 'Canal & Tube Well'})`
                      : profileData.title || 'Agricultural Specialist'}
                  </span>
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {isFarmer
                      ? `${profileData.farmAddress?.district || 'Punjab'}, ${profileData.farmAddress?.state || 'India'}`
                      : `${profileData.preferredDistrict || 'Punjab'}, ${profileData.preferredState || 'India'}`}
                  </span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {!isFarmer ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsHireModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-heading text-xs transition-all shadow-agri-glow flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Hire / Offer Job</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoiceCall}
                    disabled={isCalling}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>{isCalling ? 'Connecting...' : 'Call Worker'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/chat', { state: { recipientId: owner._id, recipientName: owner.name } })}
                    className="w-full sm:w-auto p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center"
                    title="Send Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <a
                  href={`tel:${owner.mobile}`}
                  className="px-6 py-3 rounded-2xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover transition-colors shadow-agri-glow flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Farm Owner</span>
                </a>
              )}
            </div>
          </div>

          {/* Key Stats Bar for Worker Profile */}
          {!isFarmer && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Daily Wage</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                  {workerDailyWage} / day
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {workerExp} Years
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Worker Rating</span>
                <span className="text-lg font-black text-amber-500 flex items-center justify-center space-x-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{workerRating.toFixed(1)}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Availability</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {profileData.availability || 'Immediate'}
                </span>
              </div>
            </div>
          )}

          {/* Overview */}
          <div>
            <h2 className="text-xs font-bold font-heading uppercase text-slate-400 dark:text-slate-500 mb-2">
              Overview
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {profileData.farmDescription || profileData.bio || 'Experienced and background-verified agricultural specialist available for direct seasonal and contract hiring.'}
            </p>
          </div>

          {/* Specializations */}
          <div>
            <h2 className="text-xs font-bold font-heading uppercase text-slate-400 dark:text-slate-500 mb-3">
              {isFarmer ? 'Crops & Equipment' : 'Skills & Machinery Mastery'}
            </h2>
            <div className="flex flex-wrap gap-2" role="list">
              {(profileData.cropTypes || profileData.skills || ['Crop Harvesting', 'Tractor Driving', 'Field Sowing']).map((item: string, idx: number) => (
                <span
                  key={idx}
                  role="listitem"
                  className="text-xs font-semibold px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-agri-dark dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                >
                  🌾 {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Direct Hire Worker Modal */}
      {!isFarmer && (
        <DirectHireWorkerModal
          isOpen={isHireModalOpen}
          worker={mappedWorkerForModal}
          onClose={() => setIsHireModalOpen(false)}
          onHireSuccess={() => {
            setCallFeedback('Job offer successfully submitted to worker.');
          }}
        />
      )}

      <Footer />
    </div>
  );
};

