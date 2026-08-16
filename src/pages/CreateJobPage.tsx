import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { jobService } from '../services/jobService';
import { JOB_CATEGORIES, WAGE_TYPES, PREFERRED_WORK_TYPES, GENDER_PREFERENCE } from '../constants/jobConstants';
import { JobLocationSelector } from '../components/jobs/JobLocationSelector';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
  const [wageAmount, setWageAmount] = useState<number>(650);
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

  // Image State
  const [farmFiles, setFarmFiles] = useState<File[]>([]);

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
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFarmFiles([...farmFiles, ...filesArray]);
    }
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

      farmFiles.forEach((file) => formData.append('farmImages', file));

      await jobService.createJob(formData);
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
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <ImageIcon className="w-6 h-6 text-agri-primary" />
              <h2 className="text-lg font-bold font-heading text-slate-900">Farm & Job Gallery Photos</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Upload Farm Photos</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-agri-primary rounded-xl cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-all">
                <Upload className="w-8 h-8 text-agri-primary mb-2" />
                <span className="text-sm font-medium text-slate-700">Click to select farm/job photos</span>
                <span className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP up to 5MB</span>
                <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="hidden" />
              </label>

              {farmFiles.length > 0 && (
                <p className="text-xs text-agri-primary font-semibold pt-2">
                  {farmFiles.length} file(s) selected for upload.
                </p>
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
