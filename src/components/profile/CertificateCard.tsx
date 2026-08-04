import React, { useState } from 'react';
import { Eye, Trash2, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CertificateCardProps {
  title?: string;
  imageUrl: string;
  issueDate?: string;
  onDelete?: (url: string) => void;
  className?: string;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  title = 'Agricultural Machine Operator License',
  imageUrl,
  issueDate = 'Verified Credential',
  onDelete,
  className = '',
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-3 shadow-soft-xs text-left space-y-3 relative group ${className}`}>
      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />

        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(imageUrl)}
              className="p-2 rounded-xl bg-rose-600/80 text-white hover:bg-rose-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-emerald-600 text-[11px] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{issueDate}</span>
        </div>
        <h4 className="text-xs font-bold font-heading text-slate-800 line-clamp-1">{title}</h4>
      </div>

      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl"
            >
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={imageUrl} alt={title} className="w-full max-h-[80vh] object-contain rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
