import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface ImageUploadProps {
  onSelect: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  accept?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onSelect,
  multiple = false,
  label = 'Upload Image',
  accept = 'image/*',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onSelect(files);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className={`
        border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center cursor-pointer
        hover:border-agri-primary hover:bg-emerald-50/20 transition-all duration-300 ${className}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-agri-primary flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold font-heading text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400">PNG, JPG, WEBP formats up to 5MB</p>
      </div>
    </div>
  );
};
