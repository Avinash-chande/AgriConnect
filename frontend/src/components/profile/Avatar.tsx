import React from 'react';
import { Camera, ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  role?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  onUpload?: (file: File) => void;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  role,
  isVerified = false,
  isOnline = false,
  onUpload,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm rounded-xl',
    md: 'w-16 h-16 text-xl rounded-2xl',
    lg: 'w-24 h-24 text-3xl rounded-3xl',
    xl: 'w-32 h-32 text-4xl rounded-[2rem]',
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`
          relative overflow-hidden bg-gradient-to-br from-emerald-100 to-agri-light text-agri-dark font-extrabold font-heading
          flex items-center justify-center border-2 border-white shadow-soft-sm
          ${sizeClasses[size]}
        `}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name) || <User className="w-1/2 h-1/2" />}</span>
        )}
      </motion.div>

      {/* Online Status Indicator */}
      {isOnline && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
      )}

      {/* Role Badge Indicator */}
      {role && (
        <div className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[9px] font-extrabold uppercase tracking-wider">
          {role.slice(0, 3)}
        </div>
      )}

      {/* Verification Shield */}
      {isVerified && (
        <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
          <ShieldCheck className="w-4 h-4 text-agri-primary fill-emerald-100" />
        </div>
      )}

      {/* Upload Button Overlay */}
      {onUpload && (
        <label className="absolute bottom-0 right-0 p-1.5 rounded-xl bg-agri-primary text-white shadow-md hover:bg-agri-hover transition-transform hover:scale-110 cursor-pointer">
          <Camera className="w-3.5 h-3.5" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};
