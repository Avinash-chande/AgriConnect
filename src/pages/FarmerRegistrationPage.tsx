import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, User, Building, Mail, Phone, MapPin, Lock, CheckCircle2, Tractor, ShieldCheck, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { MOCK_FARM_TYPES, MOCK_FARMS_LOCATIONS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import type { ToastMessage } from '../types';

const farmerRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  farmName: z.string().min(2, 'Farm name is required'),
  email: z.string().min(1, 'Business email is required').email('Enter a valid business email'),
  phone: z.string().min(8, 'Valid phone number is required'),
  location: z.string().min(1, 'Please select your farm location'),
  farmType: z.string().min(1, 'Please select your farm category'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FarmerFormValues = z.infer<typeof farmerRegistrationSchema>;

interface FarmerRegistrationPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const FarmerRegistrationPage: React.FC<FarmerRegistrationPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { registerFarmer } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerRegistrationSchema),
    defaultValues: {
      fullName: '',
      farmName: '',
      email: '',
      phone: '',
      location: MOCK_FARMS_LOCATIONS[0],
      farmType: MOCK_FARM_TYPES[0],
      password: '',
      confirmPassword: '',
      agreeTerms: true,
    },
  });

  const agreeTerms = watch('agreeTerms');

  const onSubmit = async (data: FarmerFormValues) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      await registerFarmer({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        farmName: data.farmName,
        farmType: data.farmType,
        location: data.location,
      });

      addToast({
        type: 'success',
        title: 'Farmer Account Created!',
        message: 'Your account is ready. Proceed to verify your phone number.'
      });

      navigate('/verify-otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Could not create farmer account.'
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
          
          <div className="bg-gradient-to-r from-slate-900 via-agri-dark to-agri-deep p-6 sm:p-8 text-white flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-semibold border border-emerald-700">
                <Tractor className="w-3.5 h-3.5 text-agri-primary" />
                <span>Farmer Registration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading">
                Create Your Farmer Account
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Access 45,000+ background-checked agricultural workers, harvesters & machinery pilots.
              </p>
            </div>

            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center text-emerald-400 border border-white/20">
              <ShieldCheck className="w-8 h-8" />
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
                1. Personal & Farm Identification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Gurpreet Singh"
                  error={errors.fullName?.message}
                  leftIcon={<User className="w-4 h-4" />}
                  {...register('fullName')}
                />

                <Input
                  label="Farm Name / Company"
                  placeholder="e.g. Green Acres Organic Estate"
                  error={errors.farmName?.message}
                  leftIcon={<Building className="w-4 h-4" />}
                  {...register('farmName')}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary mb-3">
                2. Contact & Farm Location
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business Email"
                  type="email"
                  placeholder="farmer@greenacres.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="w-4 h-4" />}
                  {...register('email')}
                />

                <Input
                  label="Phone Number (OTP Verification)"
                  type="tel"
                  placeholder="+91 98765 43210"
                  error={errors.phone?.message}
                  leftIcon={<Phone className="w-4 h-4" />}
                  {...register('phone')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Select
                  label="Farm Region / Location"
                  options={MOCK_FARMS_LOCATIONS}
                  error={errors.location?.message}
                  leftIcon={<MapPin className="w-4 h-4" />}
                  {...register('location')}
                />

                <Select
                  label="Primary Farm Category / Crop Type"
                  options={MOCK_FARM_TYPES}
                  error={errors.farmType?.message}
                  leftIcon={<Tractor className="w-4 h-4" />}
                  {...register('farmType')}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary mb-3">
                3. Security Credentials
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

            <div className="pt-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setValue('agreeTerms', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-agri-primary focus:ring-agri-primary shrink-0"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I agree to AgriConnect's <a href="#" className="text-agri-primary font-semibold underline">Terms of Service</a>, <a href="#" className="text-agri-primary font-semibold underline">Privacy Policy</a>, and consent to receiving OTP SMS messages for account verification.
                </span>
              </label>
              {errors.agreeTerms && <p className="text-xs text-rose-500 font-medium mt-1">{errors.agreeTerms.message}</p>}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Are you an agricultural worker looking for jobs? <Link to="/register-worker" className="text-agri-primary font-semibold hover:underline">Register as Worker</Link>
              </span>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                className="w-full sm:w-auto min-w-[200px] shadow-agri-glow"
              >
                Create Farmer Account
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
