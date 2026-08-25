import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Users,
  Save,
  ArrowLeft,
  CheckCircle,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import { JOB_CATEGORIES, WAGE_TYPES, PREFERRED_WORK_TYPES, GENDER_PREFERENCE } from '../constants/jobConstants';
import { JobLocationSelector } from '../components/jobs/JobLocationSelector';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const targetWorkerName = searchParams.get('workerName');
  const targetWorkerId = searchParams.get('workerId');
  const initialWage = Number(searchParams.get('wage')) || 650;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState(
    targetWorkerName ? `Farm Operations Offer for ${targetWorkerName}` : ''
  );
  const [description, setDescription] = useState(
    targetWorkerName
      ? `Dedicated agricultural assignment for ${targetWorkerName}. Please review terms, wage rate, and start date.`
      : ''
  );
  const [category, setCategory] = useState<string>(JOB_CATEGORIES[0] || 'Harvesting');
  const [cropType, setCropType] = useState('');
  const [workType, setWorkType] = useState<string>(PREFERRED_WORK_TYPES[0] || 'Contractual / Seasonal');
  const [numberOfWorkers, setNumberOfWorkers] = useState<number>(1);
  const [genderPreference, setGenderPreference] = useState<string>('Any');
  const [minimumAge, setMinimumAge] = useState<number>(18);
  const [maximumAge, setMaximumAge] = useState<number>(60);
  const [experienceRequired, setExperienceRequired] = useState<number>(0);
  const [skillInput, setSkillInput] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>(['Crop Harvesting']);
  const [wageType, setWageType] = useState<string>(WAGE_TYPES[0] || 'Daily');
  const [wageAmount, setWageAmount] = useState<number>(initialWage);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [workingHours, setWorkingHours] = useState<number>(8);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [foodProvided, setFoodProvided] = useState(false);
  const [transportProvided, setTransportProvided] = useState(false);

  // Address State
  const [district, setDistrict] = useState('Amritsar');
  const [state, setState] = useState('Punjab');
  const [village, setVillage] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number>(31.634);
  const [longitude, setLongitude] = useState<number>(75.8573);

  // Image Preview State
  interface SelectedImageItem {
    id: string;
    file: File;
    previewUrl: string;
  }

  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // Clean up object URLs when component unmounts or selected images change
  React.useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [selectedImages]);

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setImageError(null);
    const newFiles = Array.from(e.target.files);
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxTotalImages = 5;

    const availableSlots = maxTotalImages - selectedImages.length;
    if (availableSlots <= 0) {
      setImageError('Maximum of 5 photos allowed per job posting.');
      e.target.value = '';
      return;
    }

    const validNewItems: SelectedImageItem[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      if (selectedImages.length + validNewItems.length >= maxTotalImages) {
        errors.push(`Maximum of ${maxTotalImages} photos allowed.`);
        break;
      }

      if (!allowedTypes.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" is not a valid format. Please upload JPEG, PNG, or WEBP.`);
        continue;
      }

      if (file.size > maxSize) {
        errors.push(`"${file.name}" exceeds the 5MB size limit.`);
        continue;
      }

      validNewItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (errors.length > 0) {
      setImageError(errors.join(' '));
    }

    if (validNewItems.length > 0) {
      setSelectedImages((prev) => [...prev, ...validNewItems]);
    }

    e.target.value = '';
  };

  const handleRemoveImage = (idToRemove: string) => {
    setSelectedImages((prev) => {
      const itemToRemove = prev.find((item) => item.id === idToRemove);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError('Please provide a job title and description.');
      return;
    }

    if (!district.trim() || !state.trim()) {
      setError('Please specify both District and State for the job site location.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      if (cropType) formData.append('cropType', cropType);
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
      formData.append('status', 'Active');

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

      selectedImages.forEach((item) => formData.append('farmImages', item.file));

      await jobService.createJob(formData);
      
      // Revoke preview URLs on success
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setSelectedImages([]);

      setSuccessMsg('Job vacancy posted successfully!');

      setTimeout(() => {
        navigate(`/farmer/dashboard`);
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to post job vacancy.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-bg text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/farmer/dashboard')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Back to Dashboard</span>
          </button>

          <span className="text-xs font-semibold px-3.5 py-1.5 bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-200">
            Create Farm Job Vacancy
          </span>
          </div>
        {targetWorkerName && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                  Dedicated Farm Job Offer for {targetWorkerName}
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Fill in the vacancy details below. When posted, an instant job invitation will be sent to {targetWorkerName}.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Direct Hire Flow</span>
            </div>
          </div>
        )}

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Wheat Harvesting Combine Harvester Operator"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g. Wheat, Paddy, Cotton, Sugarcane"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Description *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe farm work responsibilities, required experience, equipment operation, working conditions..."
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
                  value={numberOfWorkers}
                  onChange={(e) => setNumberOfWorkers(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Gender Preference</label>
                <select
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
                  value={minimumAge}
                  onChange={(e) => setMinimumAge(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Max Age (Years)</label>
                <input
                  type="number"
                  min={18}
                  max={70}
                  value={maximumAge}
                  onChange={(e) => setMaximumAge(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  value={experienceRequired}
                  onChange={(e) => setExperienceRequired(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>
            </div>

            {/* Skills Tag Input */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Required Skills *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g. Tractor Driving, Thresher Operation..."
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim()}
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
                    <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
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
                  value={wageType}
                  onChange={(e) => setWageType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
                  value={wageAmount}
                  onChange={(e) => setWageAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-primary"
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
              jobTitle={title || 'Farm Job Vacancy'}
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

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accommodationProvided}
                  onChange={(e) => setAccommodationProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Accommodation Provided</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={foodProvided}
                  onChange={(e) => setFoodProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Food Provided</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transportProvided}
                  onChange={(e) => setTransportProvided(e.target.checked)}
                  className="w-5 h-5 accent-agri-primary rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Transport Provided</span>
              </label>
            </div>
          </div>

          {/* Section 5: Gallery Images */}
          <div className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-agri-primary flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading text-slate-900">Farm & Job Gallery Photos</h2>
                  <p className="text-xs text-slate-500">Show workers the field conditions, machinery, and crop setup</p>
                </div>
              </div>
              {selectedImages.length > 0 && (
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-agri-primary rounded-full border border-emerald-200">
                  {selectedImages.length} / 5 photos selected
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Upload Dropzone / Button */}
              {selectedImages.length < 5 && (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-agri-primary rounded-2xl cursor-pointer bg-slate-50/70 hover:bg-emerald-50/40 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-soft-sm border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center mb-3 transition-colors">
                    <Upload className="w-6 h-6 text-agri-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 group-hover:text-agri-primary transition-colors">
                    Click to select farm/job photos
                  </span>
                  <span className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP up to 5MB (Max 5 photos)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleImageFileChange}
                    className="hidden"
                    disabled={selectedImages.length >= 5}
                  />
                </label>
              )}

              {/* Validation / Error Message */}
              {imageError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center justify-between">
                  <span>{imageError}</span>
                  <button
                    type="button"
                    onClick={() => setImageError(null)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Selected Images Grid Preview */}
              {selectedImages.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Selected Photos ({selectedImages.length})
                    </span>
                    <span className="text-[11px] text-slate-500">Previews generated from selected files</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {selectedImages.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-2 flex flex-col items-center hover:border-emerald-300 hover:shadow-soft-md transition-all"
                      >
                        {/* Image Preview Container */}
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-200">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Remove Button Badge */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(item.id)}
                            title={`Remove ${item.file.name}`}
                            className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Index badge */}
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white rounded-md">
                            #{index + 1}
                          </span>
                        </div>

                        {/* File details with truncated filename */}
                        <div className="w-full mt-2 text-center">
                          <p
                            className="text-xs font-semibold text-slate-800 truncate px-1"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/farmer/dashboard')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-agri-primary hover:bg-agri-hover disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-agri-glow flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Posting Job Vacancy...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Job Vacancy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};