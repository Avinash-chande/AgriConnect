import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RotateCcw, X, MapPin, IndianRupee, Briefcase, Check } from 'lucide-react';
import { JOB_CATEGORIES, GENDER_PREFERENCE } from '../../constants/jobConstants';

export interface JobFilterParams {
  district?: string;
  village?: string;
  cropType?: string;
  category?: string;
  minDailyWage?: number;
  maxDailyWage?: number;
  minMonthlySalary?: number;
  maxMonthlySalary?: number;
  experience?: number;
  gender?: string;
  accommodation?: boolean;
  food?: boolean;
  transport?: boolean;
  isUrgent?: boolean;
  isFeatured?: boolean;
  openOnly?: boolean;
  radiusKm?: number;
  datePosted?: string;
  sort?: string;
}

interface AdvancedJobFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: JobFilterParams;
  onApplyFilters: (filters: JobFilterParams) => void;
  onResetFilters: () => void;
}

export const AdvancedJobFilterDrawer: React.FC<AdvancedJobFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [district, setDistrict] = useState(filters.district || '');
  const [village, setVillage] = useState(filters.village || '');
  const [cropType, setCropType] = useState(filters.cropType || '');
  const [category, setCategory] = useState(filters.category || '');
  const [minDailyWage, setMinDailyWage] = useState<string>(filters.minDailyWage ? String(filters.minDailyWage) : '');
  const [maxDailyWage, setMaxDailyWage] = useState<string>(filters.maxDailyWage ? String(filters.maxDailyWage) : '');
  const [minMonthlySalary, setMinMonthlySalary] = useState<string>(filters.minMonthlySalary ? String(filters.minMonthlySalary) : '');
  const [maxMonthlySalary, setMaxMonthlySalary] = useState<string>(filters.maxMonthlySalary ? String(filters.maxMonthlySalary) : '');
  const [experience, setExperience] = useState<number>(filters.experience || 10);
  const [gender, setGender] = useState<string>(filters.gender || 'Any');
  const [accommodation, setAccommodation] = useState<boolean>(!!filters.accommodation);
  const [food, setFood] = useState<boolean>(!!filters.food);
  const [transport, setTransport] = useState<boolean>(!!filters.transport);
  const [isUrgent, setIsUrgent] = useState<boolean>(!!filters.isUrgent);
  const [isFeatured, setIsFeatured] = useState<boolean>(!!filters.isFeatured);
  const [openOnly, setOpenOnly] = useState<boolean>(filters.openOnly !== undefined ? filters.openOnly : true);
  const [radiusKm, setRadiusKm] = useState<number>(filters.radiusKm || 50);
  const [datePosted, setDatePosted] = useState<string>(filters.datePosted || 'all');
  const [sort, setSort] = useState<string>(filters.sort || 'newest');

  if (!isOpen) return null;

  const handleApply = () => {
    const activeFilters: JobFilterParams = {};

    if (district.trim()) activeFilters.district = district.trim();
    if (village.trim()) activeFilters.village = village.trim();
    if (cropType.trim()) activeFilters.cropType = cropType.trim();
    if (category) activeFilters.category = category;
    if (minDailyWage) activeFilters.minDailyWage = Number(minDailyWage);
    if (maxDailyWage) activeFilters.maxDailyWage = Number(maxDailyWage);
    if (minMonthlySalary) activeFilters.minMonthlySalary = Number(minMonthlySalary);
    if (maxMonthlySalary) activeFilters.maxMonthlySalary = Number(maxMonthlySalary);
    if (experience < 10) activeFilters.experience = experience;
    if (gender && gender !== 'Any') activeFilters.gender = gender;
    if (accommodation) activeFilters.accommodation = true;
    if (food) activeFilters.food = true;
    if (transport) activeFilters.transport = true;
    if (isUrgent) activeFilters.isUrgent = true;
    if (isFeatured) activeFilters.isFeatured = true;
    if (openOnly) activeFilters.openOnly = true;
    if (radiusKm !== 50) activeFilters.radiusKm = radiusKm;
    if (datePosted !== 'all') activeFilters.datePosted = datePosted;
    if (sort !== 'newest') activeFilters.sort = sort;

    onApplyFilters(activeFilters);
    onClose();
  };

  const handleReset = () => {
    setDistrict('');
    setVillage('');
    setCropType('');
    setCategory('');
    setMinDailyWage('');
    setMaxDailyWage('');
    setMinMonthlySalary('');
    setMaxMonthlySalary('');
    setExperience(10);
    setGender('Any');
    setAccommodation(false);
    setFood(false);
    setTransport(false);
    setIsUrgent(false);
    setIsFeatured(false);
    setOpenOnly(true);
    setRadiusKm(50);
    setDatePosted('all');
    setSort('newest');

    onResetFilters();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Filter className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white">Advanced Job Filters</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Body Options */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
            {/* Quick Presets / Sorting */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort Results By</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="urgent">Urgent Jobs</option>
                <option value="featured">Featured Listings</option>
                <option value="wageHighToLow">Wage: High to Low</option>
                <option value="wageLowToHigh">Wage: Low to High</option>
                <option value="nearby">Geospatial Nearby</option>
              </select>
            </div>

            {/* Location Filters */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>Location & Radius</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Amritsar"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Village</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Rayya"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Distance Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Max Radius Distance</span>
                  <span className="font-semibold text-emerald-400">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950"
                />
              </div>
            </div>

            {/* Category & Crop Type */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <Briefcase className="w-4 h-4" />
                <span>Job Type & Crop</span>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Categories</option>
                  {JOB_CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Crop Type</label>
                <input
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g. Paddy, Wheat, Sugarcane"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Daily Wage & Monthly Salary Ranges */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <IndianRupee className="w-4 h-4" />
                <span>Wage & Salary Range (₹)</span>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Daily Wage Range</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={minDailyWage}
                    onChange={(e) => setMinDailyWage(e.target.value)}
                    placeholder="Min Daily ₹"
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={maxDailyWage}
                    onChange={(e) => setMaxDailyWage(e.target.value)}
                    placeholder="Max Daily ₹"
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Monthly Salary Range</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={minMonthlySalary}
                    onChange={(e) => setMinMonthlySalary(e.target.value)}
                    placeholder="Min Monthly ₹"
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={maxMonthlySalary}
                    onChange={(e) => setMaxMonthlySalary(e.target.value)}
                    placeholder="Max Monthly ₹"
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Experience & Gender Preference */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Gender Preference</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {GENDER_PREFERENCE.map((g: string) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Date Posted</label>
                  <select
                    value={datePosted}
                    onChange={(e) => setDatePosted(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Anytime</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkbox Amenities & Flags */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Provided Facilities & Status
              </span>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accommodation}
                    onChange={(e) => setAccommodation(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Accommodation</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={food}
                    onChange={(e) => setFood(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Food Provided</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transport}
                    onChange={(e) => setTransport(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Transport</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(e) => setOpenOnly(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Open Jobs Only</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-amber-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Urgent Only</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Featured Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Action Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
