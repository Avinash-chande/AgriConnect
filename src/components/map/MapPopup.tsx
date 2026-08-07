import React from 'react';
import { Popup } from 'react-leaflet';
import type { PopupProps } from 'react-leaflet';

export interface MapPopupProps extends PopupProps {
  children: React.ReactNode;
  className?: string;
}

export const MapPopup: React.FC<MapPopupProps> = ({
  children,
  className = '',
  maxWidth = 300,
  minWidth = 200,
  ...props
}) => {
  return (
    <Popup
      maxWidth={maxWidth}
      minWidth={minWidth}
      className={`agri-map-popup ${className}`}
      {...props}
    >
      <div className="p-1 font-sans text-slate-800 text-xs leading-relaxed space-y-2">
        {children}
      </div>
    </Popup>
  );
};
