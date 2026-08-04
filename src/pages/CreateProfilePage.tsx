import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Tractor, User, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { updateFarmerProfileApi, updateWorkerProfileApi } from '../services/profileService';
import type { ToastMessage } from '../types';

interface CreateProfilePageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const CreateProfilePage: React.FC<CreateProfilePageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { user, checkSession } = useAuth();

  const isFarmer = user?.role?.toLowerCase() === 'farmer';
  const userName = (user as any)?.name || (user as any)?.fullName || 'User';

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [titleOrFarmName, setTitleOrFarmName] = useState<string>('');
  const [district, setDistrict] = useState<string>('Amritsar');
  const [stateName, setStateName] = useState<string>('Punjab');
  const [primaryFocus, setPrimaryFocus] = useState<string>('Wheat / Rice Cultivation');
  const [dailyRateOrSize, setDailyRateOrSize] = useState<number>(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isFarmer) {
        await updateFarmerProfileApi({
          farmName: titleOrFarmName || `${userName}'s Organic Farm`,
          farmSize: Number(dailyRateOrSize),
          cropTypes: [primaryFocus],
          farmAddress: {
            district,
            state: stateName,
          },
        });
        addToast({
          type: 'success',
          title: 'Farm Profile Setup Complete!',
          message: 'Your farm profile is now live.',
        });
        await checkSession();
        navigate('/farmer/profile');
      } else {
        await updateWorkerProfileApi({
          title: titleOrFarmName || 'Specialized Agricultural Worker',
          skills: [primaryFocus],
          expectedDailyWage: Number(dailyRateOrSize) > 100 ? Number(dailyRateOrSize) : 650,
          preferredDistrict: district,
          preferredState: stateName,
        });
        addToast({
          type: 'success',
          title: 'Worker Profile Setup Complete!',
          message: 'Your skills profile is now visible to farm owners.',
        });
        await checkSession();
        navigate('/worker/profile');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Setup Error',
        message: err.message || 'Could not complete initial profile setup.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-agri-border shadow-soft-lg p-6 sm:p-10 text-left space-y-8"
        >
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 text-agri-dark border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-agri-primary" />
              <span>Initial Account Onboarding</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-agri-text">
              Create Your {isFarmer ? 'Farmer' : 'Worker'} Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Welcome to AgriConnect, <strong>{userName}</strong>! Fill in your initial details to connect with regional agricultural opportunities.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={isFarmer ? 'Commercial Farm Name' : 'Specialty Work Title'}
              value={titleOrFarmName}
              onChange={(e) => setTitleOrFarmName(e.target.value)}
              placeholder={isFarmer ? 'e.g. Golden Grain Organic Estate' : 'e.g. Heavy Tractor Operator'}
              leftIcon={isFarmer ? <Tractor className="w-4 h-4 text-slate-400" /> : <User className="w-4 h-4 text-slate-400" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Amritsar"
                leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="State"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Punjab"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={isFarmer ? 'Primary Crop Focus' : 'Primary Mastered Skill'}
                value={primaryFocus}
                onChange={(e) => setPrimaryFocus(e.target.value)}
                placeholder={isFarmer ? 'Wheat & Rice' : 'Combine Harvester Operator'}
                leftIcon={<Sprout className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label={isFarmer ? 'Farm Acreage' : 'Expected Daily Wage (₹/Day)'}
                type="number"
                value={dailyRateOrSize}
                onChange={(e) => setDailyRateOrSize(Number(e.target.value))}
                placeholder={isFarmer ? '10' : '650'}
                required
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-agri-glow w-full sm:w-auto"
              >
                Complete & Go to Dashboard
              </Button>
            </div>
          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};
