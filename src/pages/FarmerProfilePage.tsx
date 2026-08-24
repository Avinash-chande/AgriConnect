import React, { useState, useEffect } from 'react';
import {
  Sprout, Tractor, MapPin, Camera, Trash2, Plus, CheckCircle2,
  Eye, Edit3, Save, ShieldCheck, Compass, UploadCloud, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { FarmLocationManager } from '../components/farmer/FarmLocationManager';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import { useAuth } from '../context/AuthContext';
import {
  getMyProfileApi,
  updateFarmerProfileApi,
  uploadAvatarApi,
  uploadFarmImagesApi,
  deleteImageApi,
} from '../services/profileService';
import type { ToastMessage } from '../types';

interface FarmerProfilePageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const CROP_OPTIONS = ['Wheat', 'Basmati Rice', 'Sugarcane', 'Cotton', 'Mustard', 'Organic Vegetables', 'Citrus Fruit Orchards', 'Pulses & Legumes', 'Corn / Maize'];
const LIVESTOCK_OPTIONS = ['Holstein Dairy Cattle', 'Murrah Buffaloes', 'Poultry Farming', 'Goat & Sheep Unit', 'Pisciculture / Fish Pond'];
const EQUIPMENT_OPTIONS = ['Combine Harvester', '50HP Tractor & Plough', 'Rotavator', 'Drone Crop Sprayer', 'Laser Land Leveler', 'Drip Irrigation Pump'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const FarmerProfilePage: React.FC<FarmerProfilePageProps> = ({ addToast }) => {
  const { checkSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [farmName, setFarmName] = useState<string>('');
  const [farmDescription, setFarmDescription] = useState<string>('');
  const [farmSize, setFarmSize] = useState<number>(10);
  const [farmSizeUnit, setFarmSizeUnit] = useState<string>('Acres');
  const [irrigationType, setIrrigationType] = useState<string>('Drip Irrigation');
  const [cropTypes, setCropTypes] = useState<string[]>(['Wheat', 'Basmati Rice']);
  const [livestock, setLivestock] = useState<string[]>(['Holstein Dairy Cattle']);
  const [equipment, setEquipment] = useState<string[]>(['50HP Tractor & Plough', 'Laser Land Leveler']);
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  
  // Address State
  const [addressLine, setAddressLine] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Media State
  const [profileImage, setProfileImage] = useState<string>('');
  const [farmImages, setFarmImages] = useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState<number>(65);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await getMyProfileApi();
      if (response.data) {
        const u = response.data.user;
        const p = response.data.profile;

        if (u) {
          setFullName(u.name || u.fullName || '');
          setProfileImage(u.profileImage || '');
        }

        if (p) {
          setFarmName(p.farmName || '');
          setFarmDescription(p.farmDescription || '');
          setFarmSize(p.farmSize || 10);
          setFarmSizeUnit(p.farmSizeUnit || 'Acres');
          setIrrigationType(p.irrigationType || 'Drip Irrigation');
          setCropTypes(p.cropTypes || ['Wheat', 'Basmati Rice']);
          setLivestock(p.livestock || []);
          setEquipment(p.equipment || []);
          setWorkingDays(p.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
          setFarmImages(p.farmImages || []);

          if (p.farmAddress) {
            setAddressLine(p.farmAddress.addressLine || '');
            setVillage(p.farmAddress.village || '');
            setDistrict(p.farmAddress.district || '');
            setStateName(p.farmAddress.state || '');
            setPincode(p.farmAddress.pincode || '');
            setLatitude(typeof p.farmAddress.latitude === 'number' && !isNaN(p.farmAddress.latitude) ? p.farmAddress.latitude : null);
            setLongitude(typeof p.farmAddress.longitude === 'number' && !isNaN(p.farmAddress.longitude) ? p.farmAddress.longitude : null);
          } else if (p.location?.coordinates && Array.isArray(p.location.coordinates)) {
            setLongitude(p.location.coordinates[0]);
            setLatitude(p.location.coordinates[1]);
          } else {
            setAddressLine('');
            setVillage('');
            setDistrict('');
            setStateName('');
            setPincode('');
            setLatitude(null);
            setLongitude(null);
          }
        }

        setCompletionPercentage(response.data.completionPercentage || 75);
      }
    } catch (err: any) {
      console.warn('Profile load notice:', err.message);
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
          message: 'Profile image uploaded to Cloudinary successfully.'
        });
        await checkSession();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload profile picture.'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFarmImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const response = await uploadFarmImagesApi(files);
      if (response.data?.farmImages) {
        setFarmImages(response.data.farmImages);
        addToast({
          type: 'success',
          title: 'Farm Gallery Updated',
          message: `${files.length} farm photo(s) uploaded successfully.`
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload farm images.'
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteFarmImage = async (url: string) => {
    try {
      await deleteImageApi(url, 'farmImages');
      setFarmImages((prev) => prev.filter((img) => img !== url));
      addToast({
        type: 'info',
        title: 'Image Removed',
        message: 'Farm photo removed from gallery.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Error',
        message: err.message || 'Could not delete image.'
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: fullName,
        farmName,
        farmDescription,
        farmSize: Number(farmSize),
        farmSizeUnit: farmSizeUnit as any,
        cropTypes,
        livestock,
        equipment,
        irrigationType,
        workingDays,
        farmAddress: {
          addressLine: addressLine.trim(),
          village: village.trim(),
          district: district.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
          latitude: typeof latitude === 'number' && !isNaN(latitude) ? latitude : null,
          longitude: typeof longitude === 'number' && !isNaN(longitude) ? longitude : null,
          country: 'India',
        },
      };

      const response = await updateFarmerProfileApi(payload);
      if (response.data) {
        addToast({
          type: 'success',
          title: 'Farm Profile Saved!',
          message: 'Your farm details have been updated successfully.'
        });
        await loadProfileData();
        await checkSession();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save farmer profile.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-bg">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-agri-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 font-heading">
            Loading Farm Profile Dashboard...
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
                    <img src={profileImage} alt={farmName} className="w-full h-full object-cover" />
                  ) : (
                    <Tractor className="w-12 h-12" />
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

              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 bg-emerald-900/60 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Verified Farm Owner Account</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
                  {farmName || 'My Organic Farm Estate'}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100 flex items-center justify-center md:justify-start space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>{district}, {stateName} • {farmSize} {farmSizeUnit}</span>
                </p>
              </div>

            </div>

            {/* Tab Controls */}
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold font-heading flex items-center space-x-2 transition-all cursor-pointer
                  ${activeTab === 'edit'
                    ? 'bg-white text-agri-dark shadow-sm'
                    : 'text-slate-200 hover:text-white'
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
                    : 'text-slate-200 hover:text-white'
                  }
                `}
              >
                <Eye className="w-4 h-4" />
                <span>Public Worker Preview</span>
              </button>
            </div>

          </div>
        </div>

        {/* Profile Completion Card */}
        <div className="mb-8">
          <ProfileCompletionCard
            percentage={completionPercentage}
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
              
              {/* Section 1: Basic Identification */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                  <Tractor className="w-4 h-4" />
                  <span>1. Farm Name & General Description</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Owner Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Gurpreet Singh"
                  />

                  <Input
                    label="Commercial Farm Name"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Green Acres Wheat & Dairy Estate"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-1">
                    Farm Overview & Working Conditions
                  </label>
                  <textarea
                    rows={4}
                    value={farmDescription}
                    onChange={(e) => setFarmDescription(e.target.value)}
                    placeholder="Describe your farm crops, harvesting season requirements, crew facilities, and daily work hours..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-agri-primary focus:ring-2 focus:ring-agri-light outline-none transition-all"
                  />
                </div>
              </div>

              {/* Section 2: Farm Size & Irrigation */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                  <Compass className="w-4 h-4" />
                  <span>2. Land Acreage & Irrigation System</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Total Farm Land Area"
                    type="number"
                    value={farmSize}
                    onChange={(e) => setFarmSize(Number(e.target.value))}
                    placeholder="10"
                  />

                  <Select
                    label="Area Measurement Unit"
                    value={farmSizeUnit}
                    onChange={(e) => setFarmSizeUnit(e.target.value)}
                    options={['Acres', 'Hectares', 'Bigha', 'Gunta', 'Sq Ft']}
                  />

                  <Select
                    label="Primary Irrigation Source"
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    options={[
                      'Drip Irrigation',
                      'Sprinkler',
                      'Canal / Flood',
                      'Borewell / Tube Well',
                      'Rainfed',
                      'Other'
                    ]}
                  />
                </div>
              </div>

              {/* Section 3: Crops, Livestock & Equipment */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-6">
                <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                  <Sprout className="w-4 h-4" />
                  <span>3. Crops, Livestock & Farm Equipment</span>
                </h3>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                    Primary Crops Cultivated (Click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    {CROP_OPTIONS.map((crop, idx) => {
                      const isSelected = cropTypes.includes(crop);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleItem(crop, cropTypes, setCropTypes)}
                          className={`
                            text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center space-x-1.5 cursor-pointer
                            ${isSelected
                              ? 'bg-agri-primary text-white shadow-sm scale-105'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-agri-primary'
                            }
                          `}
                        >
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{crop}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                    Livestock & Animal Units
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    {LIVESTOCK_OPTIONS.map((item, idx) => {
                      const isSelected = livestock.includes(item);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleItem(item, livestock, setLivestock)}
                          className={`
                            text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center space-x-1.5 cursor-pointer
                            ${isSelected
                              ? 'bg-emerald-700 text-white shadow-sm scale-105'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600'
                            }
                          `}
                        >
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                    Farm Equipment & Heavy Machinery
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    {EQUIPMENT_OPTIONS.map((eq, idx) => {
                      const isSelected = equipment.includes(eq);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleItem(eq, equipment, setEquipment)}
                          className={`
                            text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center space-x-1.5 cursor-pointer
                            ${isSelected
                              ? 'bg-slate-900 text-white shadow-sm scale-105'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-800'
                            }
                          `}
                        >
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{eq}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Farm Location & Google Maps */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>4. Location, Address & Google Maps Coordinates</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="District / City"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Pune, Ludhiana, Indore"
                  />

                  <Input
                    label="State"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra, Punjab, MP"
                  />

                  <Input
                    label="PIN Code"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 411001"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Village / Tehsil Name"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Village or Tehsil name"
                  />

                  <Input
                    label="Street / Address Line"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="e.g. Farm road, Near canal gate"
                  />
                </div>

                <FarmLocationManager
                  farmName={farmName || 'My Farm'}
                  cropTypes={cropTypes}
                  isFarmer={true}
                  locationData={{
                    addressLine,
                    village,
                    district,
                    state: stateName,
                    pincode,
                    latitude,
                    longitude,
                  }}
                  onSaveLocation={async (updated) => {
                    if (typeof updated.latitude === 'number' && !isNaN(updated.latitude)) {
                      setLatitude(updated.latitude);
                    }
                    if (typeof updated.longitude === 'number' && !isNaN(updated.longitude)) {
                      setLongitude(updated.longitude);
                    }
                    if (updated.addressLine !== undefined) setAddressLine(updated.addressLine);
                    if (updated.village !== undefined) setVillage(updated.village);
                    if (updated.district !== undefined) setDistrict(updated.district);
                    if (updated.state !== undefined) setStateName(updated.state);
                    if (updated.pincode !== undefined) setPincode(updated.pincode);

                    addToast({
                      type: 'success',
                      title: 'Location Updated',
                      message: 'Farm location and address updated from map coordinates.',
                    });
                  }}
                  onRemoveLocation={async () => {
                    setLatitude(null);
                    setLongitude(null);
                    setAddressLine('');
                    setVillage('');
                    setDistrict('');
                    setStateName('');
                    setPincode('');

                    addToast({
                      type: 'info',
                      title: 'Location Removed',
                      message: 'Farm location removed from profile.',
                    });
                  }}
                />
              </div>

              {/* Section 5: Farm Gallery Upload */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>5. Farm Gallery Photos (Cloudinary Upload)</span>
                  </h3>

                  <label className="px-4 py-2 rounded-xl bg-emerald-100 text-agri-dark font-bold font-heading text-xs hover:bg-emerald-200 transition-colors flex items-center space-x-1.5 cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-agri-primary" />
                    <span>Upload New Photos</span>
                    <input type="file" multiple accept="image/*" onChange={handleFarmImagesUpload} className="hidden" />
                  </label>
                </div>

                {uploadingImages && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs text-slate-600">
                    <RefreshCw className="w-4 h-4 text-agri-primary animate-spin" />
                    <span>Uploading selected farm photos to Cloudinary server...</span>
                  </div>
                )}

                {farmImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {farmImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden h-36 border border-slate-200 shadow-sm">
                        <img src={imgUrl} alt={`Farm ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDeleteFarmImage(imgUrl)}
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-slate-400 text-xs">
                    No farm photos uploaded yet. Add photos of your crop fields & harvesting equipment to attract top workers.
                  </div>
                )}
              </div>

              {/* Section 6: Working Days */}
              <div className="bg-white rounded-3xl border border-agri-border shadow-soft-sm p-6 sm:p-8 text-left space-y-3">
                <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block">
                  Select Regular Farm Operations Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day, idx) => {
                    const isSelected = workingDays.includes(day);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleItem(day, workingDays, setWorkingDays)}
                        className={`
                          px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border
                          ${isSelected
                            ? 'bg-agri-primary text-white border-agri-primary shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="shadow-agri-glow"
                >
                  Save Farm Profile Changes
                </Button>
              </div>

            </motion.form>
          ) : (
            /* Live Public Preview Tab */
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl border border-agri-border shadow-soft-lg p-6 sm:p-10 text-left space-y-8"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div>
                  <span className="text-xs font-bold text-agri-primary uppercase tracking-wider block">
                    Public Worker View Preview
                  </span>
                  <h2 className="text-2xl font-bold font-heading text-agri-text mt-1">
                    {farmName}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center space-x-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-agri-primary shrink-0" />
                    <span>{district}, {stateName} • {farmSize} {farmSizeUnit} ({irrigationType})</span>
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={() => setActiveTab('edit')} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                  Back to Editing
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-2">About the Farm</h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {farmDescription || 'No description provided yet.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Crops Cultivated</h4>
                <div className="flex flex-wrap gap-2">
                  {cropTypes.map((crop, idx) => (
                    <span key={idx} className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-agri-dark border border-emerald-200 rounded-xl">
                      🌾 {crop}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Equipment & Machinery</h4>
                <div className="flex flex-wrap gap-2">
                  {equipment.map((eq, idx) => (
                    <span key={idx} className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl">
                      🚜 {eq}
                    </span>
                  ))}
                </div>
              </div>

              {farmImages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold font-heading uppercase text-slate-400 mb-3">Farm Photo Gallery</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {farmImages.map((img, idx) => (
                      <img key={idx} src={img} alt="Farm" className="w-full h-32 object-cover rounded-2xl border border-slate-200" />
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
