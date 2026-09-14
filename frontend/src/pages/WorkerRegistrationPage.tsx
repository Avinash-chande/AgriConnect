import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, User, Mail, Phone, MapPin, Lock, Briefcase, CheckCircle2, Award, Plus, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { MOCK_FARMS_LOCATIONS, MOCK_WORKER_SKILLS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import type { ToastMessage } from '../types';

const workerRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().min(8, 'Valid phone number is required'),
  location: z.string().min(1, 'Preferred location is required'),
  experience: z.string().min(1, 'Experience level is required'),
  skills: z.array(z.string()).min(1, 'Select at least 1 primary skill'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type WorkerFormValues = z.infer<typeof workerRegistrationSchema>;

interface WorkerRegistrationPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const WorkerRegistrationPage: React.FC<WorkerRegistrationPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { registerWorker } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English', 'Hindi']);

  const availableLanguages = ['English', 'Hindi', 'Punjabi', 'Spanish', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Bengali'];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerRegistrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      location: MOCK_FARMS_LOCATIONS[0],
      experience: 'Skilled (2-5 Years)',
      skills: ['Combine Harvester Operator', 'Tractor Driver & Ploughing'],
      password: '',
      confirmPassword: '',
    },
  });

  const selectedSkills = watch('skills') || [];

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setValue('skills', selectedSkills.filter((s: string) => s !== skill), { shouldValidate: true });
    } else {
      setValue('skills', [...selectedSkills, skill], { shouldValidate: true });
    }
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l: string) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const onSubmit = async (data: WorkerFormValues) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await registerWorker({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        location: data.location,
        skills: data.skills,
        experienceLevel: data.experience,
        languages: selectedLanguages,
      });

      addToast({
        type: 'info',
        title: 'Verification Code Sent',
        message: 'A 6-digit OTP code has been sent to your email. Please verify to complete your registration.'
      });

      navigate('/verify-otp', { state: { email: result.email } });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Could not create worker profile.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col justify-between">
      <header className="py-5 px-6 sm:px-12 flex items-center justify-between border-b border-agri-border bg-white">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-agri-primary flex items-center justify-center text-white shadow-agri-glow">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold font-heading text-agri-text">
            AgriConnect
          </span>
        </Link>

        <span className="text-xs text-slate-500 font-medium">
          Already registered? <Link to="/login" className="text-agri-primary hover:underline font-semibold">Sign In</Link>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="max-w-4xl w-full bg-white rounded-3xl border border-agri-border shadow-soft-lg overflow-hidden text-left">
          
          <div className="bg-gradient-to-r from-agri-dark via-emerald-700 to-agri-primary p-6 sm:p-8 text-white flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-semibold border border-emerald-600">
                <Briefcase className="w-3.5 h-3.5 text-agri-light" />
                <span>Agricultural Worker Registration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading">
                Join AgriConnect as a Verified Worker
              </h1>
              <p className="text-xs sm:text-sm text-slate-100">
                Get direct access to top-paying commercial farms, daily payouts, and flexible contracts.
              </p>
            </div>

            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md items-center justify-center text-white border border-white/20">
              <Award className="w-8 h-8" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-10 space-y-6">
            
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <span className="font-bold block">Registration Error</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary mb-3">
                1. Personal Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Rajesh Kumar"
                  error={errors.fullName?.message}
                  leftIcon={<User className="w-4 h-4" />}
                  {...register('fullName')}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="rajesh@agriconnect.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="w-4 h-4" />}
                  {...register('email')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Phone Number (SMS for OTP)"
                  type="tel"
                  placeholder="+91 98123 45678"
                  error={errors.phone?.message}
                  leftIcon={<Phone className="w-4 h-4" />}
                  {...register('phone')}
                />

                <Select
                  label="Preferred Work Location / Region"
                  options={MOCK_FARMS_LOCATIONS}
                  error={errors.location?.message}
                  leftIcon={<MapPin className="w-4 h-4" />}
                  {...register('location')}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary mb-3">
                2. Skills & Experience Level
              </h3>

              <div className="mb-4">
                <Select
                  label="Total Agricultural Experience"
                  options={[
                    'Entry Level (0-1 Year)',
                    'Skilled (2-5 Years)',
                    'Senior Expert (5+ Years)',
                    'Master Technician (10+ Years)'
                  ]}
                  error={errors.experience?.message}
                  leftIcon={<Award className="w-4 h-4" />}
                  {...register('experience')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                  Select Primary Agricultural Skills (Click to toggle)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  {MOCK_WORKER_SKILLS.map((skill, idx) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`
                          text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center space-x-1.5 cursor-pointer
                          ${isSelected
                            ? 'bg-agri-primary text-white shadow-sm scale-105'
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
                {errors.skills && <p className="text-xs text-rose-500 font-medium mt-1">{errors.skills.message}</p>}
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-agri-text tracking-wide uppercase block mb-2">
                  Languages Spoken
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((lang, idx) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`
                          text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border
                          ${isSelected
                            ? 'bg-emerald-100 text-agri-dark border-emerald-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        {lang} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary mb-3">
                3. Account Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  isPassword
                  placeholder="••••••••••••"
                  error={errors.password?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  {...register('password')}
                />

                <Input
                  label="Confirm Password"
                  isPassword
                  placeholder="••••••••••••"
                  error={errors.confirmPassword?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  {...register('confirmPassword')}
                />
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Are you a farm owner looking to hire? <Link to="/register-farmer" className="text-agri-primary font-semibold hover:underline">Register as Farmer</Link>
              </span>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                className="w-full sm:w-auto min-w-[200px] shadow-agri-glow"
              >
                Create Worker Account
              </Button>
            </div>
          </form>

        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-agri-border bg-white">
        © {new Date().getFullYear()} AgriConnect Platform. All rights reserved.
      </footer>
    </div>
  );
};
