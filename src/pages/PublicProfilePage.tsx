import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, MapPin, ShieldCheck, Tractor, Briefcase, Phone, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { getProfileByIdOrSlugApi } from '../services/profileService';
import { ProfileCardSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';
import { SEO } from '../components/common/SEO';

export const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

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
        <div className="mb-6 text-left">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-agri-primary focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-md px-1 py-0.5 transition-colors"
            aria-label="Return to network listings"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Network Listings</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-agri-border dark:border-slate-800 shadow-soft-lg p-6 sm:p-10 text-left space-y-8"
        >
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
                      ? `${profileData.farmSize} ${profileData.farmSizeUnit} (${profileData.irrigationType})`
                      : profileData.title}
                  </span>
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {isFarmer
                      ? `${profileData.farmAddress?.district}, ${profileData.farmAddress?.state}`
                      : `${profileData.preferredDistrict}, ${profileData.preferredState}`}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-2 shrink-0">
              <a
                href={`tel:${owner.mobile}`}
                className="px-6 py-3 rounded-2xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover transition-colors shadow-agri-glow flex items-center justify-center space-x-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label={`Call ${owner.name} at ${owner.mobile}`}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Contact {isFarmer ? 'Farm Owner' : 'Worker'}</span>
              </a>
            </div>
          </div>

          {/* Overview */}
          <div>
            <h2 className="text-xs font-bold font-heading uppercase text-slate-400 dark:text-slate-500 mb-2">
              Overview
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {profileData.farmDescription || profileData.bio || 'No additional bio details provided.'}
            </p>
          </div>

          {/* Specializations */}
          <div>
            <h2 className="text-xs font-bold font-heading uppercase text-slate-400 dark:text-slate-500 mb-3">
              {isFarmer ? 'Crops & Equipment' : 'Skills & Machinery Mastery'}
            </h2>
            <div className="flex flex-wrap gap-2" role="list">
              {(profileData.cropTypes || profileData.skills || []).map((item: string, idx: number) => (
                <span
                  key={idx}
                  role="listitem"
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-agri-dark dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                >
                  🌾 {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};
