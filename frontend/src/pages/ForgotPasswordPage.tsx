import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Phone, ArrowLeft, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { forgotPasswordApi } from '../services/authService';
import type { ToastMessage } from '../types';

const emailResetSchema = z.object({
  inputValue: z.string().min(1, 'Email address is required').email('Enter a valid email address'),
});

const phoneResetSchema = z.object({
  inputValue: z.string().min(8, 'Enter a valid phone number'),
});

type ResetFormValues = { inputValue: string };

interface ForgotPasswordPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ addToast }) => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedValue, setSubmittedValue] = useState('');

  const currentSchema = mode === 'email' ? emailResetSchema : phoneResetSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: { inputValue: '' },
  });

  const onSubmit = async (data: ResetFormValues) => {
    setErrorMessage('');
    setIsLoading(true);
    setStatus('idle');
    setSubmittedValue(data.inputValue);

    try {
      const payload = mode === 'email' ? { email: data.inputValue } : { phone: data.inputValue };
      await forgotPasswordApi(payload);

      setStatus('success');
      addToast({
        type: 'success',
        title: 'OTP Reset Code Sent',
        message: `Verification code sent to ${data.inputValue}.`
      });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'No account found with this credential. Please verify and try again.');
      addToast({
        type: 'error',
        title: 'Account Not Found',
        message: err.message || 'No registered farmer or worker matches the provided details.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: 'email' | 'phone') => {
    setMode(newMode);
    setStatus('idle');
    setErrorMessage('');
    reset({ inputValue: '' });
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

        <Link to="/login" className="text-xs font-semibold text-agri-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-agri-border shadow-soft-lg p-6 sm:p-10 text-left">
          
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-agri-primary mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-agri-text">
              Forgot Password?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              No worries! Enter your email or phone number to receive a 6-digit password reset OTP code.
            </p>
          </div>

          <div className="mb-6 bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              type="button"
              onClick={() => toggleMode('email')}
              className={`
                flex-1 py-2 text-xs font-bold font-heading rounded-lg flex items-center justify-center space-x-1.5 transition-all
                ${mode === 'email' ? 'bg-white text-agri-dark shadow-sm' : 'text-slate-500'}
              `}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Via Email</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMode('phone')}
              className={`
                flex-1 py-2 text-xs font-bold font-heading rounded-lg flex items-center justify-center space-x-1.5 transition-all
                ${mode === 'phone' ? 'bg-white text-agri-dark shadow-sm' : 'text-slate-500'}
              `}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Via Phone SMS</span>
            </button>
          </div>

          {status === 'error' && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <span className="font-bold block">Reset Failed</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-agri-dark">
                  <CheckCircle2 className="w-5 h-5 text-agri-primary" />
                  <span>OTP Sent Successfully!</span>
                </div>
                <p>
                  We have sent a 6-digit verification code to <strong>{submittedValue}</strong>. Please check your inbox or mobile messages.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  if (submittedValue) {
                    sessionStorage.setItem('pending_password_reset_email', submittedValue);
                  }
                  navigate('/verify-otp', {
                    state: {
                      email: submittedValue,
                      purpose: 'password_reset',
                    },
                  });
                }}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Proceed to Enter OTP
              </Button>

              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="w-full text-center text-xs text-slate-500 hover:text-agri-primary font-medium flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try a different contact detail
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label={mode === 'email' ? 'Registered Email Address' : 'Registered Phone Number'}
                type={mode === 'email' ? 'email' : 'tel'}
                placeholder={mode === 'email' ? 'farmer@agriconnect.com' : '+91 98765 43210'}
                error={errors.inputValue?.message}
                leftIcon={mode === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {...register('inputValue')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={<Send className="w-4 h-4" />}
                className="shadow-agri-glow"
              >
                Send Password Reset OTP
              </Button>
            </form>
          )}

        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-agri-border bg-white">
        © {new Date().getFullYear()} AgriConnect Platform. All rights reserved.
      </footer>
    </div>
  );
};
