import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Users,
  ShieldAlert,
  Save,
  ArrowLeft,
  CheckCircle,
  Plus,
  X,
  Upload,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import { JOB_CATEGORIES, WAGE_TYPES, PREFERRED_WORK_TYPES, GENDER_PREFERENCE } from '../constants/jobConstants';
import { DeleteJobModal } from '../components/common/DeleteJobModal';
import { JobLocationSelector } from "../components/jobs/JobLocationSelector";
import type { JobLocationData } from "../components/jobs/JobLocationSelector";

export const EditJobPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(JOB_CATEGORIES[0]);
  const [cropType, setCropType] = useState('');
  const [workType, setWorkType] = useState<string>(PREFERRED_WORK_TYPES[0]);
  const [numberOfWorkers, setNumberOfWorkers] = useState<number>(1);
  const [genderPreference, setGenderPreference] = useState<string>('Any');
  const [minimumAge, setMinimumAge] = useState<number>(18);
  const [maximumAge, setMaximumAge] = useState<number>(60);
  const [experienceRequired, setExperienceRequired] = useState<number>(0);
  const [skillInput, setSkillInput] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [wageType, setWageType] = useState<string>(WAGE_TYPES[0]);
  const [wageAmount, setWageAmount] = useState<number>(500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workingHours, setWorkingHours] = useState<number>(8);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [foodProvided, setFoodProvided] = useState(false);
  const [transportProvided, setTransportProvided] = useState(false);
  const [status, setStatus] = useState<'Active' | 'Paused' | 'Closed'>('Active');

  // Address State
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [village, setVillage] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number>(31.634);
  const [longitude, setLongitude] = useState<number>(75.8573);

  // Image State
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFarmFiles, setNewFarmFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchJobDetails(id);
  }, [id]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getJobById(jobId);

      const storedUser = localStorage.getItem('agri_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const farmerId = data.farmer?._id || data.farmer;
          if (user.role === 'Admin') {
            setIsAdmin(true);
          }
          if (user._id && farmerId && user._id !== farmerId) {
            setIsOwner(false);
          }
        } catch {
          // Ignored
        }
      }

      if (data.status === 'Closed' || data.status === 'Expired') {
        setIsClosed(true);
      }

      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategory(data.category || JOB_CATEGORIES[0]);
      setCropType(data.cropType || '');
      setWorkType(data.workType || PREFERRED_WORK_TYPES[0]);
      setNumberOfWorkers(data.numberOfWorkers || 1);
      setGenderPreference(data.genderPreference || 'Any');
      setMinimumAge(data.minimumAge || 18);
      setMaximumAge(data.maximumAge || 60);
      setExperienceRequired(data.experienceRequired || 0);
      setRequiredSkills(data.requiredSkills || []);
      setWageType(data.wageType || WAGE_TYPES[0]);
      setWageAmount(data.dailyWage || data.monthlySalary || 500);

      if (data.startDate) {
        setStartDate(new Date(data.startDate).toISOString().split('T')[0]);
      }
      if (data.endDate) {
        setEndDate(new Date(data.endDate).toISOString().split('T')[0]);
      }

      setWorkingHours(data.workingHours || 8);
      setAccommodationProvided(!!data.accommodationProvided);
      setFoodProvided(!!data.foodProvided);
      setTransportProvided(!!data.transportProvided);
      setStatus((data.status as 'Active' | 'Paused' | 'Closed') || 'Active');

      if (data.jobAddress) {
        setDistrict(data.jobAddress.district || '');
        setState(data.jobAddress.state || '');
        setVillage(data.jobAddress.village || '');
        setAddressLine(data.jobAddress.addressLine || '');
        setPincode(data.jobAddress.pincode || '');
        if (typeof data.jobAddress.latitude === 'number') setLatitude(data.jobAddress.latitude);
        if (typeof data.jobAddress.longitude === 'number') setLongitude(data.jobAddress.longitude);
      }

      setExistingImages([...(data.farmImages || []), ...(data.jobImages || [])]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skillToRemove));
  };

  const handleRemoveExistingImage = (imgUrl: string) => {
    setExistingImages(existingImages.filter((img) => img !== imgUrl));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFarmFiles([...newFarmFiles, ...filesArray]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!isOwner) {
      setError('You are not authorized to edit this job vacancy.');
      return;
    }

    if (isClosed) {
      setError('Closed or expired job postings cannot be edited.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('cropType', cropType);
      formData.append('workType', workType);
      formData.append('numberOfWorkers', numberOfWorkers.toString());
      formData.append('genderPreference', genderPreference);
      formData.append('minimumAge', minimumAge.toString());
      formData.append('maximumAge', maximumAge.toString());
      formData.append('experienceRequired', experienceRequired.toString());
      formData.append('requiredSkills', JSON.stringify(requiredSkills));
      formData.append('wageType', wageType);

      if (wageType === 'Daily') {
        formData.append('dailyWage', wageAmount.toString());
      } else if (wageType === 'Monthly') {
        formData.append('monthlySalary', wageAmount.toString());
      } else {
        formData.append('dailyWage', wageAmount.toString());
      }

      formData.append('startDate', startDate);
      if (endDate) formData.append('endDate', endDate);
      formData.append('workingHours', workingHours.toString());
      formData.append('accommodationProvided', accommodationProvided.toString());
      formData.append('foodProvided', foodProvided.toString());
      formData.append('transportProvided', transportProvided.toString());
      formData.append('status', status);

      formData.append(
        'jobAddress',
        JSON.stringify({
          district,
          state,
          village,
          addressLine,
          pincode,
          latitude,
          longitude,
        })
      );

      formData.append('farmImages', JSON.stringify(existingImages));
      newFarmFiles.forEach((file) => formData.append('farmImages', file));

      const updated = await jobService.updateJob(id, formData);
      setSuccessMsg('Job vacancy updated successfully!');

      setTimeout(() => {
        navigate(`/jobs/${updated._id || id}`);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update job posting.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-agri-bg text-slate-800 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-agri-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading Job Details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-bg text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-3">
            {(isOwner || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 flex items-center space-x-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Job</span>
              </button>
            )}

            <span className="text-xs font-semibold px-3.5 py-1.5 bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-200">
              Edit Job Vacancy
            </span>
          </div>
        </div>

        {/* Ownership & Status Warnings */}
        {!isOwner && !isAdmin && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Read-Only Mode</h4>
              <p className="text-xs text-amber-800 mt-1">
                You are viewing this job as a non-owner. Only the farmer who created this posting can make modifications.
              </p>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Closed Job Vacancy</h4>
              <p className="text-xs text-rose-800 mt-1">
                This job posting is closed or expired. Please re-open or activate the status to edit fields.
              </p>
            </div>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-rose-600 hover:text-rose-900" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <Briefcase className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Basic Job Vacancy Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Title *</label>
                <input
                  type="text"
                  disabled={!isOwner || isClosed}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Paddy Harvesting Combine Operator"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Category *</label>
                <select
                  disabled={!isOwner || isClosed}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                >
                  {JOB_CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Crop Type</label>
                <input
                  type="text"
                  disabled={!isOwner || isClosed}
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g. Wheat, Paddy, Cotton, Sugarcane"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Description *</label>
                <textarea
                  rows={4}
                  disabled={!isOwner || isClosed}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe job responsibilities, farm conditions, working tools required..."
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Worker Requirements & Skills */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <Users className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Worker Requirements & Skills</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Work Type *</label>
                <select
                  disabled={!isOwner || isClosed}
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                >
                  {PREFERRED_WORK_TYPES.map((type: string) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Workers Needed *</label>
                <input
                  type="number"
                  min={1}
                  disabled={!isOwner || isClosed}
                  value={numberOfWorkers}
                  onChange={(e) => setNumberOfWorkers(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Gender Preference</label>
                <select
                  disabled={!isOwner || isClosed}
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                >
                  {GENDER_PREFERENCE.map((gender: string) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Min Age (Years)</label>
                <input
                  type="number"
                  min={18}
                  max={70}
                  disabled={!isOwner || isClosed}
                  value={minimumAge}
                  onChange={(e) => setMinimumAge(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Max Age (Years)</label>
                <input
                  type="number"
                  min={18}
                  max={70}
                  disabled={!isOwner || isClosed}
                  value={maximumAge}
                  onChange={(e) => setMaximumAge(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  disabled={!isOwner || isClosed}
                  value={experienceRequired}
                  onChange={(e) => setExperienceRequired(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Skills Tag Input */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Required Skills *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  disabled={!isOwner || isClosed}
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g. Tractor Driving, Thresher Operation..."
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!isOwner || isClosed || !skillInput.trim()}
                  className="px-5 py-3 bg-agri-primary hover:bg-agri-hover disabled:opacity-50 text-white font-medium rounded-xl flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200"
                  >
                    <span>{skill}</span>
                    {isOwner && !isClosed && (
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Wages & Work Schedule */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <IndianRupee className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Wage & Work Schedule</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Wage Type *</label>
                <select
                  disabled={!isOwner || isClosed}
                  value={wageType}
                  onChange={(e) => setWageType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                >
                  {WAGE_TYPES.map((type: string) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Wage Amount (₹) *</label>
                <input
                  type="number"
                  min={0}
                  disabled={!isOwner || isClosed}
                  value={wageAmount}
                  onChange={(e) => setWageAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Start Date *</label>
                <input
                  type="date"
                  disabled={!isOwner || isClosed}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  disabled={!isOwner || isClosed}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Location & Facilities */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <MapPin className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Farm Location & Facilities</h2>
            </div>

            <JobLocationSelector
              jobTitle={title}
              category={category}
              wageText={wageType === 'Daily' ? `₹${wageAmount}/day` : `₹${wageAmount}/month`}
              location={{
                district: district || 'Amritsar',
                state: state || 'Punjab',
                village,
                addressLine,
                pincode,
                latitude,
                longitude,
              }}
              onChangeLocation={(updated) => {
                setDistrict(updated.district);
                setState(updated.state);
                if (updated.village) setVillage(updated.village);
                if (updated.addressLine) setAddressLine(updated.addressLine);
                if (updated.pincode) setPincode(updated.pincode);
                setLatitude(updated.latitude);
                setLongitude(updated.longitude);
              }}
            />

            {/* Checkbox Facilities */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOwner || isClosed}
                  checked={accommodationProvided}
                  onChange={(e) => setAccommodationProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Accommodation Provided</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOwner || isClosed}
                  checked={foodProvided}
                  onChange={(e) => setFoodProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Food Provided</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOwner || isClosed}
                  checked={transportProvided}
                  onChange={(e) => setTransportProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Transport Provided</span>
              </label>
            </div>
          </div>

          {/* Section 5: Farm & Job Gallery Images */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <ImageIcon className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Farm & Job Gallery Images</h2>
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Images</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {existingImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video">
                      <img src={imgUrl} alt="Farm sample" className="w-full h-full object-cover" />
                      {isOwner && !isClosed && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(imgUrl)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New File Input */}
            {isOwner && !isClosed && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Upload Additional Photos</label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-agri-primary rounded-xl cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-all">
                  <Upload className="w-8 h-8 text-agri-primary mb-2" />
                  <span className="text-sm font-medium text-slate-700">Click to select new farm/job photos</span>
                  <span className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP up to 5MB</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="hidden" />
                </label>

                {newFarmFiles.length > 0 && (
                  <p className="text-xs text-agri-primary font-semibold pt-2">
                    {newFarmFiles.length} new image file(s) selected for upload.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Status Management */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Job Vacancy Status</h3>
            <div className="flex items-center space-x-4">
              {(['Active', 'Paused', 'Closed'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  disabled={!isOwner}
                  onClick={() => setStatus(st)}
                  className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    status === st
                      ? st === 'Active'
                        ? 'bg-agri-primary text-white font-bold shadow-soft-sm'
                        : st === 'Paused'
                        ? 'bg-amber-500 text-white font-bold shadow-soft-sm'
                        : 'bg-rose-600 text-white font-bold shadow-soft-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isOwner || isClosed || submitting}
              className="px-8 py-3 bg-agri-primary hover:bg-agri-hover disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-agri-glow flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Job Vacancy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {id && (
        <DeleteJobModal
          isOpen={isDeleteModalOpen}
          jobId={id}
          jobTitle={title}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={() => {
            setIsDeleteModalOpen(false);
            navigate('/dashboard');
          }}
        />
      )}
    </div>
  );
};
