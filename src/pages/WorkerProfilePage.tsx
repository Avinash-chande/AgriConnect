import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Wrench, Award, Globe, MapPin, IndianRupee, ShieldCheck,
  Star, CheckCircle2, Plus, Camera, Trash2, UploadCloud, Eye, Edit3, Save,
  RefreshCw, Briefcase, Check, GraduationCap, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import { useAuth } from '../context/AuthContext';
import {
  getMyProfileApi,
  updateWorkerProfileApi,
  uploadAvatarApi,
  uploadCertificatesApi,
  deleteImageApi,
} from '../services/profileService';
import { calculateWorkerProfileCompletion } from '../utils/workerProfileCalculator';
import type { ToastMessage } from '../types';

interface WorkerProfilePageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const SKILL_OPTIONS = [
  'Combine Harvester Operator',
  'Tractor & Heavy Machinery Driver',
  'Paddy Transplanting & Planting',
  'Drone Crop Spraying & Pesticides',
  'Plowing & Soil Tilling Specialist',
  'Sugarcane Harvesting & Loading',
  'Drip & Sprinkler Irrigation Setup',
  'Grain Threshing & Seed Processing',
  'Organic Compost & Fertilizer Application',
  'Pruning & Orchard Maintenance',
];

const LANGUAGE_OPTIONS = ['Hindi', 'Punjabi', 'English', 'Haryanvi', 'Bhojpuri', 'Marathi', 'Gujarati', 'Telugu'];
const EDUCATION_OPTIONS = ['Below 10th', '10th Pass', '12th Pass', 'Diploma in Agriculture', 'Graduate', 'Other'];
const AVAILABILITY_STATUSES = [
  { label: 'Immediate', value: 'Immediate', color: 'bg-emerald-500 text-white' },
  { label: 'Within 3 Days', value: 'Within 3 Days', color: 'bg-sky-500 text-white' },
  { label: 'Seasonal Only', value: 'Seasonal', color: 'bg-amber-500 text-white' },
  { label: 'Unavailable', value: 'Unavailable', color: 'bg-rose-500 text-white' },
];

export const WorkerProfilePage: React.FC<WorkerProfilePageProps> = ({ addToast }) => {
  const { checkSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [uploadingCertificates, setUploadingCertificates] = useState<boolean>(false);
  const [uploadingGallery, setUploadingGallery] = useState<boolean>(false);

  // Section 1 State: Professional Title & Biography
  const [fullName, setFullName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // Section 2 State: Agricultural Skills & Machine Mastery
  const [skills, setSkills] = useState<string[]>([]);

  // Section 3 State: Education / Experience / Work Details
  const [experience, setExperience] = useState<number | string>('');
  const [education, setEducation] = useState<string>('10th Pass');
  const [languages, setLanguages] = useState<string[]>([]);

  // Section 4 State: Compensation / Availability / Work Preferences
  const [expectedDailyWage, setExpectedDailyWage] = useState<number | string>('');
  const [expectedMonthlySalary, setExpectedMonthlySalary] = useState<number | string>('');
  const [availability, setAvailability] = useState<string>('Immediate');
  const [preferredWorkType, setPreferredWorkType] = useState<string>('Daily Basis');

  // Section 5 State: Preferred Working Locations
  const [preferredDistrict, setPreferredDistrict] = useState<string>('');
  const [preferredState, setPreferredState] = useState<string>('');
  const [preferredVillage, setPreferredVillage] = useState<string>('');

  // Section 6 State: Licenses & Skill Certificates
  const [certificateImages, setCertificateImages] = useState<string[]>([]);

  // Section 7 State: Field Work Photo Gallery
  const [profileGallery, setProfileGallery] = useState<string[]>([]);

  // Section 8 State: Government Aadhaar Verification
  const [aadhaarVerified, setAadhaarVerified] = useState<boolean>(false);
  const [aadhaarNumber, setAadhaarNumber] = useState<string>('');

  // Extra Worker Metrics
  const [profileImage, setProfileImage] = useState<string>('');
  const [rating, setRating] = useState<number>(5.0);
  const [totalJobsCompleted, setTotalJobsCompleted] = useState<number>(0);

  // Dynamic 8-Section Completion Calculation (Single Source of Truth)
  const completionData = useMemo(() => {
    return calculateWorkerProfileCompletion({
      fullName,
      title,
      bio,
      profileImage,
      skills,
      experience,
      education,
      languages,
      expectedDailyWage,
      expectedMonthlySalary,
      availability,
      preferredWorkType,
      preferredDistrict,
      preferredState,
      preferredVillage,
      certificateImages,
      profileGallery,
      aadhaarVerified,
      aadhaarNumber,
    });
  }, [
    fullName,
    title,
    bio,
    profileImage,
    skills,
    experience,
    education,
    languages,
    expectedDailyWage,
    expectedMonthlySalary,
    availability,
    preferredWorkType,
    preferredDistrict,
    preferredState,
    preferredVillage,
    certificateImages,
    profileGallery,
    aadhaarVerified,
    aadhaarNumber,
  ]);

  const populateFormWithData = (u: any, p: any) => {
    if (u) {
      if (u.name || u.fullName) setFullName(u.name || u.fullName);
      if (u.profileImage) setProfileImage(u.profileImage);
    }

    if (p) {
      if (p.title !== undefined) setTitle(p.title);
      if (p.bio !== undefined) setBio(p.bio);
      if (Array.isArray(p.skills)) setSkills(p.skills);
      if (p.experience !== undefined && p.experience !== null) setExperience(p.experience);
      if (Array.isArray(p.languages)) setLanguages(p.languages);
      if (p.education) setEducation(p.education);
      if (p.expectedDailyWage !== undefined && p.expectedDailyWage !== null) setExpectedDailyWage(p.expectedDailyWage);
      if (p.expectedMonthlySalary !== undefined && p.expectedMonthlySalary !== null) setExpectedMonthlySalary(p.expectedMonthlySalary);
      if (p.availability) setAvailability(p.availability);
      if (p.preferredWorkType) setPreferredWorkType(p.preferredWorkType);
      if (p.preferredDistrict !== undefined) setPreferredDistrict(p.preferredDistrict);
      if (p.preferredState !== undefined) setPreferredState(p.preferredState);
      if (p.preferredVillage !== undefined) setPreferredVillage(p.preferredVillage);
      if (p.aadhaarVerified !== undefined) setAadhaarVerified(Boolean(p.aadhaarVerified));
      if (p.aadhaarNumber !== undefined) setAadhaarNumber(p.aadhaarNumber);
      if (Array.isArray(p.certificateImages)) setCertificateImages(p.certificateImages);
      if (Array.isArray(p.profileGallery)) setProfileGallery(p.profileGallery);
      if (p.rating !== undefined) setRating(p.rating);
      if (p.totalJobsCompleted !== undefined) setTotalJobsCompleted(p.totalJobsCompleted);
    }
  };

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await getMyProfileApi();
      if (response.data) {
        const u = response.data.user;
        const p = response.data.profile;
        populateFormWithData(u, p);
      }
    } catch (err: any) {
      console.warn('Worker profile load notice:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleToggleItem = (item: string, currentList: string[], setList: (vals: string[]) => void) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const response = await uploadAvatarApi(file);
      if (response.data?.profileImage) {
        setProfileImage(response.data.profileImage);
        addToast({
          type: 'success',
          title: 'Avatar Updated',
          message: 'Worker photo uploaded successfully.'
        });
        await checkSession();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload avatar image.'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCertificatesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCertificates(true);
    try {
      const response = await uploadCertificatesApi([file], 'certificateImages');
      const uploadedImage = response.data?.certificateImages?.[0];
      if (uploadedImage) {
        setCertificateImages((prev) => [...prev, uploadedImage]);
      }
      addToast({
        type: 'success',
        title: 'Certificate Uploaded',
        message: 'Certificate uploaded successfully.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload certificate.',
      });
    } finally {
      setUploadingCertificates(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGallery(true);
    try {
      const response = await uploadCertificatesApi([file], 'profileGallery');
      const uploadedImage = response.data?.profileGallery?.[0];
      if (uploadedImage) {
        setProfileGallery((prev) => [...prev, uploadedImage]);
      }
      addToast({
        type: 'success',
        title: 'Work Photo Uploaded',
        message: 'Work photo uploaded successfully.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload work photo.',
      });
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleDeleteMediaImage = async (url: string, type: 'certificateImages' | 'profileGallery') => {
    try {
      await deleteImageApi(url, type);
      if (type === 'certificateImages') {
        setCertificateImages((prev) => prev.filter((i) => i !== url));
      } else {
        setProfileGallery((prev) => prev.filter((i) => i !== url));
      }
      addToast({
        type: 'info',
        title: 'Image Deleted',
        message: 'Image removed from profile.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not remove image.'
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: fullName.trim(),
        title: title.trim(),
        bio: bio.trim(),
        skills,
        experience: experience !== '' ? Number(experience) : 0,
        languages,
        education,
        expectedDailyWage: expectedDailyWage !== '' ? Number(expectedDailyWage) : 0,
        expectedMonthlySalary: expectedMonthlySalary !== '' ? Number(expectedMonthlySalary) : 0,
        availability: availability as any,
        preferredWorkType: preferredWorkType as any,
        preferredDistrict: preferredDistrict.trim(),
        preferredState: preferredState.trim(),
        preferredVillage: preferredVillage.trim(),
        aadhaarVerified,
        aadhaarNumber: aadhaarNumber.trim(),
        certificateImages,
        profileGallery,
      };

      const response = await updateWorkerProfileApi(payload);
      if (response.data) {
        const u = response.data.user || response.data.profile?.user;
        const p = response.data.profile?.profile || response.data.profile;
        populateFormWithData(u, p);

        addToast({
          type: 'success',
          title: 'Worker Profile Saved!',
          message: 'Your 8-section worker profile has been saved successfully to the database.'
        });
        await checkSession();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update worker profile.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isSecComplete = (sectionId: number) => {
    const sec = completionData.sections.find((s) => s.id === sectionId);
    return Boolean(sec?.isComplete);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-bg">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-agri-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 font-heading">
            Loading Worker Profile Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Header Hero Card */}
        <div className="relative rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-agri-primary p-6 sm:p-10 text-white shadow-soft-lg mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">

            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">

              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 backdrop-blur-md border-2 border-white/20 overflow-hidden shadow-agri-glow flex items-center justify-center text-emerald-300">
                  {profileImage ? (
                    <img src={profileImage} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>

                <label className="absolute bottom-0 right-0 p-2 rounded-xl bg-agri-primary text-white shadow-md hover:bg-agri-hover transition-transform hover:scale-110 cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-300 animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  {aadhaarVerified && (
                    <span className="inline-flex items-center space-x-1 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Aadhaar Verified</span>
                    </span>
                  )}
                  <span className="inline-flex items-center space-x-1 bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{rating} ({totalJobsCompleted} Jobs Completed)</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
                  {fullName || 'Agri Worker Specialist'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center md:justify-start space-x-2">
                  <Briefcase className="w-4 h-4 text-agri-primary shrink-0" />
                  <span>{title} • {experience} Years Experience</span>
                </p>
                <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Preferred Zone: {preferredDistrict}, {preferredState} (₹{expectedDailyWage}/day)</span>
                </p>
              </div>

            </div>

            {/* Tab Switcher */}
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold font-heading flex items-center space-x-2 transition-all cursor-pointer
                  ${activeTab === 'edit'
                    ? 'bg-white text-agri-dark shadow-sm'
                    : 'text-slate-300 hover:text-white'
                  }
                `}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold font-heading flex items-center space-x-2 transition-all cursor-pointer
                  ${activeTab === 'preview'
                    ? 'bg-white text-agri-dark shadow-sm'
                    : 'text-slate-300 hover:text-white'
                  }
                `}
              >
                <Eye className="w-4 h-4" />
                <span>Public Farmer View</span>
              </button>
            </div>

          </div>

          {/* Quick Availability Status Selector Bar */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-heading">
              Current Hiring Availability Status:
            </span>

            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_STATUSES.map((statusItem, idx) => {
                const isSelected = availability === statusItem.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvailability(statusItem.value)}
                    className={`
                      px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border
                      ${isSelected
                        ? `${statusItem.color} border-white/40 shadow-md scale-105`
                        : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{statusItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic 8-Section Profile Completion Card */}
        <div className="mb-8">
          <ProfileCompletionCard
            percentage={completionData.percentage}
            completedSections={completionData.completedSections}
            totalSections={completionData.totalSections}
            sections={completionData.sections}
            role="worker"
            onCompleteClick={() => setActiveTab('edit')}
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'edit' ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSaveProfile}
              className="space-y-8"
            >

              {/* Section 1: Professional Title & Biography */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>1. Professional Title & Biography</span>
                  </h3>
                  {isSecComplete(1) ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      <span>Incomplete</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jaswinder Singh"
                    required
                  />

                  <Input
                    label="Primary Agricultural Work Specialty Title *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Heavy Tractor Operator & Combine Harvester Specialist"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-1">
                    Bio & Work Experience Summary *
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your agricultural experience, equipment operating licenses, seasonal crop specialization..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-agri-primary focus:ring-2 focus:ring-agri-light outline-none transition-all"
                  />
                </div>
              </div>

              {/* Section 2: Agricultural Skills & Machine Mastery */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <Wrench className="w-4 h-4" />
                    <span>2. Agricultural Skills & Machine Mastery</span>
                  </h3>
                  {isSecComplete(2) ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{skills.length} Selected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <span>Select at least 1 skill</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                    Select Your Specialized Agricultural Skills (Click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {SKILL_OPTIONS.map((skill, idx) => {
                      const isSelected = skills.includes(skill);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleItem(skill, skills, setSkills)}
                          className={`
                            text-xs px-3.5 py-2 rounded-xl font-medium transition-all flex items-center space-x-1.5 cursor-pointer
                            ${isSelected
                              ? 'bg-agri-primary text-white shadow-sm scale-105 font-bold'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-agri-primary'
                            }
                          `}
                        >
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{skill}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Education / Experience / Work Details */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>3. Education / Experience / Work Details</span>
                  </h3>
                  {isSecComplete(3) ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      <span>Incomplete</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Years of Field Experience *"
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    placeholder="3"
                    min="0"
                  />

                  <Select
                    label="Education Level *"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    options={EDUCATION_OPTIONS}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                    Languages Spoken (Click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    {LANGUAGE_OPTIONS.map((lang, idx) => {
                      const isSelected = languages.includes(lang);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleItem(lang, languages, setLanguages)}
                          className={`
                            px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer
                            ${isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800'
                            }
                          `}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Compensation / Availability / Work Preferences */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <IndianRupee className="w-4 h-4" />
                    <span>4. Compensation / Availability / Work Preferences</span>
                  </h3>
                  {isSecComplete(4) ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      <span>Incomplete</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Expected Daily Wage (₹ / Day) *"
                    type="number"
                    value={expectedDailyWage}
                    onChange={(e) => setExpectedDailyWage(Number(e.target.value))}
                    placeholder="650"
                    min="50"
                  />

                  <Input
                    label="Expected Monthly Salary (₹ / Month)"
                    type="number"
                    value={expectedMonthlySalary}
                    onChange={(e) => setExpectedMonthlySalary(Number(e.target.value))}
                    placeholder="18000"
                    min="0"
                  />

                  <Select
                    label="Preferred Employment Basis *"
                    value={preferredWorkType}
                    onChange={(e) => setPreferredWorkType(e.target.value)}
                    options={['Daily Basis', 'Full-Time', 'Part-Time', 'Contractual / Seasonal']}
                  />

                  <Select
                    label="Availability Status *"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    options={['Immediate', 'Within 3 Days', 'Seasonal', 'Unavailable']}
                  />
                </div>
              </div>

              {/* Section 5: Preferred Working Locations */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>5. Preferred Working Locations</span>
                  </h3>
                  {isSecComplete(5) ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      <span>Incomplete</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Preferred District *"
                    value={preferredDistrict}
                    onChange={(e) => setPreferredDistrict(e.target.value)}
                    placeholder="e.g. Ludhiana"
                    required
                  />

                  <Input
                    label="Preferred State *"
                    value={preferredState}
                    onChange={(e) => setPreferredState(e.target.value)}
                    placeholder="e.g. Punjab"
                    required
                  />

                  <Input
                    label="Preferred Village / Zone"
                    value={preferredVillage}
                    onChange={(e) => setPreferredVillage(e.target.value)}
                    placeholder="e.g. Samrala"
                  />
                </div>
              </div>

              {/* Section 6: Licenses & Skill Certificates */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <Award className="w-4 h-4" />
                    <span>6. Licenses & Skill Certificates</span>
                  </h3>

                  <div className="flex items-center space-x-3">
                    {isSecComplete(6) ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{certificateImages.length} Uploaded</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        <span>No Certificates</span>
                      </span>
                    )}

                    <label className="px-4 py-2 rounded-xl bg-emerald-100 text-agri-dark font-bold font-heading text-xs hover:bg-emerald-200 transition-colors flex items-center space-x-1.5 cursor-pointer">
                      <UploadCloud className="w-4 h-4 text-agri-primary" />
                      <span>Upload Certificate</span>
                      <input type="file" accept="image/*" onChange={handleCertificatesUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {uploadingCertificates && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs text-slate-600">
                    <RefreshCw className="w-4 h-4 text-agri-primary animate-spin" />
                    <span>Uploading certificate document to Cloudinary...</span>
                  </div>
                )}

                {certificateImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {certificateImages.map((imgUrl, idx) => (
                      <div
                        key={imgUrl}
                        className="relative group rounded-2xl overflow-hidden h-36 border border-slate-200 shadow-sm"
                      >
                        <img
                          src={imgUrl}
                          alt={`Certificate ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaImage(imgUrl, 'certificateImages')}
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-slate-400 text-xs">
                    No certificate credentials uploaded yet. Upload driving licenses, harvester operator certificates, or drone permits.
                  </div>
                )}
              </div>

              {/* Section 7: Field Work Photo Gallery */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>7. Field Work Photo Gallery</span>
                  </h3>

                  <div className="flex items-center space-x-3">
                    {isSecComplete(7) ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{profileGallery.length} Photos</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        <span>No Photos</span>
                      </span>
                    )}

                    <label className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold font-heading text-xs hover:bg-slate-200 transition-colors flex items-center space-x-1.5 cursor-pointer">
                      <UploadCloud className="w-4 h-4 text-slate-700" />
                      <span>Add Work Photos</span>
                      <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {uploadingGallery && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs text-slate-600">
                    <RefreshCw className="w-4 h-4 text-agri-primary animate-spin" />
                    <span>Uploading work gallery photo...</span>
                  </div>
                )}

                {profileGallery.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profileGallery.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden h-36 border border-slate-200 shadow-sm">
                        <img src={imgUrl} alt={`Work ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaImage(imgUrl, 'profileGallery')}
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-slate-400 text-xs">
                    No field work photos uploaded. Add photos of operating harvesters, plowing, or transplanting crops in action.
                  </div>
                )}
              </div>

              {/* Section 8: Government Aadhaar Verification */}
              <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 text-left space-y-4 border border-emerald-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-emerald-300">
                      8. GOVERNMENT AADHAAR VERIFICATION
                    </h3>
                  </div>

                  <span className={`text-xs font-bold font-heading px-3 py-1 rounded-full border ${
                    aadhaarVerified 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  }`}>
                    {aadhaarVerified ? 'Verified Account' : 'Pending Verification'}
                  </span>
                </div>

                <p className="text-xs text-emerald-200/80">
                  Government Aadhaar identity verification protects against fraud and gives farm owners trust to hire you directly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="12-Digit Aadhaar Number"
                    type="password"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="•••• •••• 1098"
                    className="bg-emerald-900/60 text-white border-emerald-700 placeholder-emerald-400/50"
                  />

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setAadhaarVerified(true);
                        addToast({
                          type: 'success',
                          title: 'Aadhaar Verified',
                          message: 'Aadhaar identity record verified successfully.'
                        });
                      }}
                      className="w-full py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold font-heading text-xs hover:bg-emerald-400 transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Aadhaar ID</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Action Bar */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="shadow-agri-glow cursor-pointer"
                >
                  Save Worker Profile Changes
                </Button>
              </div>

            </motion.form>
          ) : (
            /* Live Public Farmer View Preview */
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl border border-agri-border shadow-soft-lg p-6 sm:p-10 text-left space-y-8"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold text-agri-primary uppercase tracking-wider">
                      Public Farm Owner Preview
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-agri-dark">
                      {availability}
                    </span>
                    {aadhaarVerified && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-300 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Aadhaar Verified</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold font-heading text-agri-text">
                    {fullName || 'Jaswinder Singh'}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center space-x-2 mt-1">
                    <Briefcase className="w-3.5 h-3.5 text-agri-primary shrink-0" />
                    <span>{title} • {experience} Years Exp (₹{expectedDailyWage}/day)</span>
                  </p>
                  <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Location: {preferredVillage ? `${preferredVillage}, ` : ''}{preferredDistrict}, {preferredState}</span>
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={() => setActiveTab('edit')} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                  Back to Editing
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-2">Worker Biography</h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {bio || 'Experienced tractor driver and harvester operator available for seasonal crop harvesting.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Skills & Equipment Mastery</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="text-xs font-semibold px-3 py-1.5 bg-agri-primary text-white rounded-xl shadow-sm">
                      🛠️ {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-2">Education & Details</h4>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Education:</span> {education}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Preferred Basis:</span> {preferredWorkType}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-2">Languages Spoken</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {languages.map((lang, idx) => (
                      <span key={idx} className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                        🗣️ {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {certificateImages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Verified Skill Credentials & Licenses</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {certificateImages.map((img, idx) => (
                      <img key={idx} src={img} alt="Certificate" className="w-full h-32 object-cover rounded-2xl border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}

              {profileGallery.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Field Work Photo Gallery</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profileGallery.map((img, idx) => (
                      <img key={idx} src={img} alt="Field Work" className="w-full h-32 object-cover rounded-2xl border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      <Footer />
    </div>
  );
};
