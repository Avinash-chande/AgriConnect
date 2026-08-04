import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, ShieldCheck, CheckCircle2, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/common/Button';
import { verifyOTPApi, sendOTPApi } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import type { ToastMessage } from '../types';

const otpFormSchema = z.object({
  otpCode: z.string().length(6, 'Please enter all 6 digits of the OTP code').regex(/^\d{6}$/, 'OTP code must contain only numbers'),
});

type OTPFormValues = z.infer<typeof otpFormSchema>;

interface OTPVerificationPageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const OTPVerificationPage: React.FC<OTPVerificationPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const { user, checkSession } = useAuth();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OTPFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otpCode: '' },
  });

  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  const updateOtpState = (newOtpArr: string[]) => {
    setOtp(newOtpArr);
    const joined = newOtpArr.join('');
    setValue('otpCode', joined, { shouldValidate: joined.length === 6 });
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    updateOtpState(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      updateOtpState(digits);
      inputRefs.current[5]?.focus();
      addToast({
        type: 'info',
        title: 'OTP Code Pasted',
        message: '6-digit security code automatically filled.'
      });
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      if (user?.email || user?.phone) {
        await sendOTPApi({
          email: user?.email,
          phone: user?.phone,
        });
      }

      setTimer(60);
      setCanResend(false);
      updateOtpState(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      addToast({
        type: 'success',
        title: 'New Code Dispatched',
        message: 'A fresh 6-digit OTP code has been sent to your registered device.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Resend Failed',
        message: err.message || 'Could not send fresh OTP.'
      });
    }
  };

  const onSubmit = async (data: OTPFormValues) => {
    setErrorMessage('');
    setIsVerifying(true);

    try {
      await verifyOTPApi({
        email: user?.email,
        phone: user?.phone,
        otpCode: data.otpCode,
      });

      await checkSession();

      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      addToast({
        type: 'success',
        title: 'Account Verified Successfully!',
        message: 'Welcome to AgriConnect. You are ready to explore the platform.'
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP code. Please try again.');
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'Invalid OTP verification code.'
      });
    } finally {
      setIsVerifying(false);
    }
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
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-agri-border shadow-soft-lg p-6 sm:p-10 text-center">
          
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-agri-primary flex items-center justify-center mx-auto shadow-agri-glow">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <h2 className="text-2xl font-bold font-heading text-agri-text">
                  Verification Successful!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Your phone & email account have been verified. Redirecting you to the platform...
                </p>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="mt-4"
                >
                  Go to Platform Home
                </Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-agri-primary flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <h1 className="text-2xl font-bold font-heading text-agri-text">
                  Enter 6-Digit OTP Code
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  We've sent a 6-digit security code to {user?.email ? <strong>{user.email}</strong> : 'your registered device'}.
                </p>

                {errorMessage && (
                  <p className="mt-3 text-xs text-rose-500 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {errorMessage}
                  </p>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className={`
                          w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-heading rounded-xl border bg-slate-50 text-agri-text
                          transition-all duration-200 shadow-sm outline-none focus:bg-white
                          ${digit 
                            ? 'border-agri-primary ring-2 ring-agri-light bg-emerald-50/50' 
                            : 'border-slate-200 focus:border-agri-primary focus:ring-2 focus:ring-agri-light'
                          }
                        `}
                      />
                    ))}
                  </div>

                  {errors.otpCode && (
                    <p className="text-xs text-rose-500 font-medium">{errors.otpCode.message}</p>
                  )}

                  <div className="flex items-center justify-between text-xs px-2 text-slate-500">
                    <span>
                      Resend code in: <strong className="text-agri-text font-bold">{timer}s</strong>
                    </span>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={!canResend}
                      className={`
                        font-bold flex items-center gap-1 transition-colors
                        ${canResend ? 'text-agri-primary hover:underline cursor-pointer' : 'text-slate-300 cursor-not-allowed'}
                      `}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend OTP Code
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isVerifying}
                    rightIcon={<CheckCircle2 className="w-4 h-4" />}
                    className="shadow-agri-glow"
                  >
                    Verify & Complete Account
                  </Button>
                </form>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-agri-border bg-white">
        © {new Date().getFullYear()} AgriConnect Platform. All rights reserved.
      </footer>
    </div>
  );
};
