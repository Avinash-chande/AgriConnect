import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Lock, Tractor, Briefcase, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import type { UserRole, ToastMessage } from '../types';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState<UserRole>('farmer');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await login({
        email: data.email,
        password: data.password,
      });

      addToast({
        type: 'success',
        title: 'Sign In Successful',
        message: `Welcome back, ${user.fullName}! Logged in as a ${user.role === 'farmer' ? 'Farmer' : 'Worker'}.`
      });

      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: err.message || 'Could not authenticate. Please check your credentials.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    addToast({
      type: 'info',
      title: `${provider} Single Sign-On`,
      message: `Connecting to ${provider} OAuth authentication...`
    });
  };

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col justify-between">
      <header className="py-6 px-6 sm:px-12 flex items-center justify-between border-b border-agri-border bg-white">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-agri-primary flex items-center justify-center text-white shadow-agri-glow">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold font-heading text-agri-text">
            AgriConnect
          </span>
        </Link>

        <span className="text-xs text-slate-500 font-medium">
          Need help? <a href="#" className="text-agri-primary hover:underline font-semibold">Contact Support</a>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="max-w-5xl w-full bg-white rounded-3xl border border-agri-border shadow-soft-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-agri-dark to-agri-deep p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden text-left min-h-[380px] lg:min-h-auto">
            <div 
              className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center pointer-events-none"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800')` }}
            />
            <div className="absolute top-0 right-0 w-64 h-64 bg-agri-primary/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-700/80 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-agri-primary" />
                <span>Backend Connected Auth</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight leading-snug">
                Empowering the Future of Farm Labor
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Log in to manage your active harvesting jobs, contact verified crews, or accept direct daily payout tasks.
              </p>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-emerald-800/80 space-y-2">
              <p className="text-xs text-slate-200 italic leading-relaxed">
                "AgriConnect transformed how we hire combines & drone operators. Immediate verification and zero hassle."
              </p>
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-agri-primary" />
                <span>Punjab Organic Estate Alliance</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 text-left flex flex-col justify-center">
            
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-agri-text tracking-tight">
                Sign In to AgriConnect
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter your registered email and password to access your portal.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <span className="font-bold block">Authentication Error</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="mb-6 bg-slate-100 p-1.5 rounded-2xl flex items-center space-x-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`
                  flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 transition-all duration-200
                  ${role === 'farmer' 
                    ? 'bg-white text-agri-dark shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
                  }
                `}
              >
                <Tractor className="w-4 h-4 text-agri-primary" />
                <span>I am a Farmer</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('worker')}
                className={`
                  flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 transition-all duration-200
                  ${role === 'worker' 
                    ? 'bg-white text-agri-dark shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
                  }
                `}
              >
                <Briefcase className="w-4 h-4 text-agri-primary" />
                <span>I am a Worker</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder={role === 'farmer' ? "farmer@farmestate.com" : "worker@agriconnect.com"}
                error={errors.email?.message}
                leftIcon={<Mail className="w-4 h-4" />}
                {...register('email')}
              />

              <Input
                label="Password"
                isPassword
                placeholder="••••••••••••"
                error={errors.password?.message}
                leftIcon={<Lock className="w-4 h-4" />}
                {...register('password')}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setValue('rememberMe', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-agri-primary focus:ring-agri-primary"
                  />
                  <span className="text-slate-600 font-medium">Remember me on this device</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="font-semibold text-agri-primary hover:text-agri-hover hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="mt-2 shadow-agri-glow"
              >
                Sign In as {role === 'farmer' ? 'Farmer' : 'Agricultural Worker'}
              </Button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => handleSocialLogin('Google')}
                leftIcon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                }
              >
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => handleSocialLogin('Microsoft')}
                leftIcon={
                  <svg className="w-4 h-4" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                }
              >
                Microsoft
              </Button>
            </div>

            <div className="mt-8 text-center text-xs text-slate-500 space-y-1.5">
              <p>Don't have an account yet?</p>
              <div className="flex items-center justify-center space-x-4 font-semibold text-agri-primary">
                <Link to="/register-farmer" className="hover:underline">Register as Farmer</Link>
                <span>•</span>
                <Link to="/register-worker" className="hover:underline">Register as Worker</Link>
              </div>
            </div>

          </div>

        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-agri-border bg-white">
        © {new Date().getFullYear()} AgriConnect Platform. All rights reserved.
      </footer>
    </div>
  );
};
