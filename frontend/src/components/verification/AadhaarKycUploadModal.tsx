import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  Lock,
  FileCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { uploadAadhaarKycApi } from '../../services/verificationService';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AadhaarKycUploadModal: React.FC<ModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select your official UIDAI Offline e-KYC ZIP file.');
      return;
    }
    if (!shareCode || shareCode.trim().length !== 4 || !/^\d{4}$/.test(shareCode.trim())) {
      setError('Please enter a valid 4-digit numeric Share Code used during ZIP creation.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('zipFile', file);
      formData.append('shareCode', shareCode.trim());

      const response = await uploadAadhaarKycApi(formData);

      setSuccessMsg(response.message || 'Aadhaar e-KYC processed successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to process Aadhaar e-KYC. Please verify your ZIP file and Share Code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-white">
                  Aadhaar Offline e-KYC Upload
                </h3>
                <p className="text-xs text-slate-400 font-mono">System B — Official Identity Verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Privacy Guarantee Box */}
          <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-xs space-y-1.5 text-blue-300">
            <div className="flex items-center space-x-2 font-semibold text-blue-200">
              <Lock size={14} className="text-blue-400 shrink-0" />
              <span>Zero-Storage Privacy Protection Guaranteed</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              We process your ZIP file in-memory using Node.js crypto signature verification.
              <strong> Full Aadhaar numbers, OTPs, biometrics, and Share Codes are NEVER stored.</strong>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <FileCheck size={16} className="shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step Guide */}
          <div className="space-y-2 text-xs">
            <p className="font-mono text-slate-400 uppercase text-[11px]">How to get your e-KYC ZIP:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
              <li>Visit the official <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center space-x-0.5"><span>UIDAI myAadhaar Portal</span><ExternalLink size={10} /></a>.</li>
              <li>Select <strong>Paperless Offline e-KYC</strong> and enter a 4-digit Share Code.</li>
              <li>Download the password-protected ZIP file and upload it below.</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Upload UIDAI Offline e-KYC ZIP File (.zip)
              </label>
              <div className="relative border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 text-center bg-slate-950/60 transition-colors">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud size={24} className="mx-auto text-slate-500 mb-1" />
                {file ? (
                  <p className="text-emerald-400 font-mono font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                ) : (
                  <p className="text-slate-400">Click or drag & drop your UIDAI ZIP file here</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Enter 4-Digit Share Code
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="e.g. 1234"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center font-mono text-lg text-white tracking-widest focus:outline-none focus:border-blue-500/50"
              />
              <p className="text-[11px] text-slate-500 mt-1">The 4-digit code set during ZIP download on the UIDAI portal.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file || shareCode.length !== 4}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:opacity-95 disabled:opacity-50 flex items-center space-x-2 transition-all shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Signature...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Process & Verify</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
