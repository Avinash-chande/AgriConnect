import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, X, User, MapPin, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../context/AuthContext';
import { updateFarmerProfileApi, updateWorkerProfileApi } from '../../services/profileService';

interface ProfileCompletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProfileCompletionWizard: React.FC<ProfileCompletionWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [farmNameOrTitle, setFarmNameOrTitle] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [primarySkillOrCrop, setPrimarySkillOrCrop] = useState<string>('Wheat / Rice Cultivation');

  if (!isOpen) return null;

  const isFarmer = user?.role?.toLowerCase() === 'farmer';

  const handleFinishWizard = async () => {
    setIsSubmitting(true);
    try {
      const userName = (user as any)?.name || (user as any)?.fullName || 'User';
      if (isFarmer) {
        await updateFarmerProfileApi({
          farmName: farmNameOrTitle || `${userName}'s Farm`,
          cropTypes: [primarySkillOrCrop],
          farmAddress: {
            district,
            state: stateName,
          },
        });
      } else {
        await updateWorkerProfileApi({
          title: farmNameOrTitle || 'Agricultural Specialist',
          skills: [primarySkillOrCrop],
          expectedDailyWage: 650,
          preferredDistrict: district,
          preferredState: stateName,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Wizard setup error:', err);
    } fontally: () => {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 text-left space-y-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-agri-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-agri-primary uppercase tracking-wider">
              Step {step} of 3 • Quick Setup Wizard
            </span>
            <h3 className="text-xl font-bold font-heading text-agri-text">
              {step === 1 && (isFarmer ? 'Farm Ownership Details' : 'Professional Worker Specialty')}
              {step === 2 && 'Primary Location & Zone'}
              {step === 3 && (isFarmer ? 'Primary Crop Focus' : 'Mastered Agricultural Skill')}
            </h3>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div
            className="bg-agri-primary h-2 rounded-full"
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Contents */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input
                label={isFarmer ? 'Farm / Estate Name' : 'Specialization Title'}
                value={farmNameOrTitle}
                onChange={(e) => setFarmNameOrTitle(e.target.value)}
                placeholder={isFarmer ? 'e.g. Green Valley Organic Estate' : 'e.g. Combine Harvester Operator'}
                leftIcon={<User className="w-4 h-4 text-slate-400" />}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Amritsar"
                  leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                />
                <Input
                  label="State"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Punjab"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input
                label={isFarmer ? 'Primary Crop Cultivated' : 'Primary Agricultural Skill'}
                value={primarySkillOrCrop}
                onChange={(e) => setPrimarySkillOrCrop(e.target.value)}
                placeholder={isFarmer ? 'e.g. Wheat & Basmati Rice' : 'e.g. Tractor & Heavy Harvester Driver'}
                leftIcon={<Sprout className="w-4 h-4 text-slate-400" />}
              />

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-agri-dark flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-agri-primary shrink-0 mt-0.5" />
                <span>
                  Completing this wizard optimizes your profile to 80%+ completion, boosting your visibility across regional search filters.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={handleFinishWizard}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4 text-emerald-200" />}
            >
              Complete Setup
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
