import React, { useState, useRef } from 'react';
import { UploadCloud, Trash2, Eye, RefreshCw, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadManagerProps {
  title?: string;
  images: string[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (url: string) => Promise<void>;
  onReplace?: (oldUrl: string, newFile: File) => Promise<void>;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedFormats?: string[];
}

export const ImageUploadManager: React.FC<ImageUploadManagerProps> = ({
  title = 'Image Gallery & Document Upload',
  images = [],
  onUpload,
  onDelete,
  onReplace,
  maxFiles = 6,
  maxSizeMB = 5,
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [replacingUrl, setReplacingUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): boolean => {
    setErrorMessage(null);
    if (images.length + files.length > maxFiles) {
      setErrorMessage(`You can upload a maximum of ${maxFiles} images.`);
      return false;
    }

    for (const file of files) {
      if (!allowedFormats.includes(file.type)) {
        setErrorMessage(`Invalid format for '${file.name}'. Only JPEG, PNG, and WEBP formats are supported.`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMessage(`File '${file.name}' exceeds the maximum allowed size of ${maxSizeMB}MB.`);
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!validateFiles(files)) return;

    setIsUploading(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      await onUpload(files);
      setUploadProgress(100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Image upload failed. Please try again.');
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplaceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingUrl) return;

    if (!validateFiles([file])) return;

    setIsUploading(true);
    try {
      if (onReplace) {
        await onReplace(replacingUrl, file);
      } else {
        await onDelete(replacingUrl);
        await onUpload([file]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Image replacement failed.');
    } finally {
      setIsUploading(false);
      setReplacingUrl(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary flex items-center space-x-2">
          <ImageIcon className="w-4 h-4" />
          <span>{title}</span>
        </h4>

        <span className="text-xs font-medium text-slate-400">
          {images.length} / {maxFiles} Uploaded (Max {maxSizeMB}MB each)
        </span>
      </div>

      {/* Validation Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Drag & Drop Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 relative overflow-hidden
          ${isUploading
            ? 'bg-emerald-50/50 border-emerald-300 pointer-events-none'
            : 'bg-slate-50/60 border-slate-300 hover:border-agri-primary hover:bg-emerald-50/20'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <input
          ref={replaceInputRef}
          type="file"
          accept={allowedFormats.join(',')}
          onChange={handleReplaceSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-agri-primary flex items-center justify-center">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <p className="text-xs font-bold font-heading text-agri-text">
            {isUploading ? 'Uploading to Cloudinary CDN...' : 'Click or Drag & Drop Images Here'}
          </p>
          <p className="text-[11px] text-slate-400">
            JPEG, PNG, WEBP files up to {maxSizeMB}MB (Auto Compressed & Optimized)
          </p>
        </div>

        {/* Real-time Animated Progress Bar */}
        {isUploading && (
          <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-agri-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Uploaded Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
          {images.map((imgUrl, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group rounded-2xl overflow-hidden h-36 border border-slate-200 shadow-sm bg-slate-100"
            >
              <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />

              {/* Hover Controls Overlay */}
              <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(imgUrl)}
                  className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer"
                  title="Preview Image"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplacingUrl(imgUrl);
                    replaceInputRef.current?.click();
                  }}
                  className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer"
                  title="Replace Image"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(imgUrl)}
                  className="p-2 rounded-xl bg-rose-600/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Fullscreen Image Preview Modal */}
      <AnimatePresence>
        {previewModalUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl"
            >
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <img src={previewModalUrl} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
