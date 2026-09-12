import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, X, QrCode, MessageCircle, Send, Globe } from 'lucide-react';
import { jobService } from '../../services/jobService';

interface ShareJobModalProps {
  isOpen: boolean;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

export const ShareJobModal: React.FC<ShareJobModalProps> = ({
  isOpen,
  jobId,
  jobTitle,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const baseUrl = `${window.location.origin}/jobs/${jobId}`;
  const shareText = `Check out this agricultural job vacancy on AgriConnect: "${jobTitle}"`;

  const handleShareClick = (channel: string) => {
    // Fire metric increment
    jobService.incrementShareCount(jobId).catch(() => {});

    const dynamicUrl = `${baseUrl}?utm_source=${channel}&utm_medium=social_share`;

    let targetUrl = '';
    switch (channel) {
      case 'whatsapp':
        targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${dynamicUrl}`)}`;
        break;
      case 'telegram':
        targetUrl = `https://t.me/share/url?url=${encodeURIComponent(dynamicUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dynamicUrl)}`;
        break;
      case 'twitter':
        targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(dynamicUrl)}`;
        break;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = () => {
    jobService.incrementShareCount(jobId).catch(() => {});
    const dynamicUrl = `${baseUrl}?utm_source=copy_link&utm_medium=clipboard`;
    navigator.clipboard.writeText(dynamicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `${baseUrl}?utm_source=qr_code`
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Share Job Vacancy</h3>
                <p className="text-xs text-slate-400">Spread the word to agricultural workers</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Social Share Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {/* WhatsApp */}
            <button
              onClick={() => handleShareClick('whatsapp')}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20 transition-all flex flex-col items-center justify-center space-y-1.5 group"
            >
              <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => handleShareClick('telegram')}
              className="p-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/20 transition-all flex flex-col items-center justify-center space-y-1.5 group"
            >
              <Send className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">Telegram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleShareClick('facebook')}
              className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/20 transition-all flex flex-col items-center justify-center space-y-1.5 group"
            >
              <Globe className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">Facebook</span>
            </button>

            {/* Twitter */}
            <button
              onClick={() => handleShareClick('twitter')}
              className="p-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/20 transition-all flex flex-col items-center justify-center space-y-1.5 group"
            >
              <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">Twitter / X</span>
            </button>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Job Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={baseUrl}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Toggle QR Code View */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              onClick={() => setShowQR(!showQR)}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>{showQR ? 'Hide Mobile QR Code' : 'Generate Mobile Scan QR Code'}</span>
            </button>

            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 flex flex-col items-center space-y-2"
              >
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img src={qrCodeUrl} alt="Job QR Code" className="w-40 h-40 object-contain" />
                </div>
                <span className="text-[11px] text-slate-400">Scan with smartphone camera to open job details</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
