import React from 'react';
import { AgriLocationPicker } from './AgriLocationPicker';
import type { AgriLocationPickerProps, SelectedLocationData } from './AgriLocationPicker';
import { X } from 'lucide-react';

export interface AgriLocationPickerModalProps extends AgriLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgriLocationPickerModal: React.FC<AgriLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  ...props
}) => {
  if (!isOpen) return null;

  const handleConfirm = (locationData: SelectedLocationData) => {
    if (onConfirm) {
      onConfirm(locationData);
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
        <AgriLocationPicker
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          {...props}
        />
      </div>
    </div>
  );
};
