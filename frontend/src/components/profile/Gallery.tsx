import React, { useState } from 'react';
import { Eye, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryProps {
  images: string[];
  onDelete?: (url: string) => void;
  title?: string;
  emptyText?: string;
  className?: string;
}

export const Gallery: React.FC<GalleryProps> = ({
  images = [],
  onDelete,
  emptyText = 'No gallery images uploaded yet.',
  className = '',
}) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-slate-400 text-xs">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((imgUrl, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            className="relative group rounded-2xl overflow-hidden h-36 border border-slate-200 shadow-sm bg-slate-100 cursor-pointer"
          >
            <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />

            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setLightboxUrl(imgUrl)}
                className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors"
                title="View Photo"
              >
                <Eye className="w-4 h-4" />
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(imgUrl);
                  }}
                  className="p-2 rounded-xl bg-rose-600/80 text-white hover:bg-rose-600 transition-colors"
                  title="Delete Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl"
            >
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <img src={lightboxUrl} alt="Enlarged" className="w-full max-h-[80vh] object-contain rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
