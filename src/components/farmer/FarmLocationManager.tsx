import React, { useState } from 'react';
import { AgriLocationPickerModal } from '../location/AgriLocationPickerModal';
import { LocationMap } from '../map/LocationMap';
import { FarmMarker } from '../map/FarmMarker';
import { SelectedLocationData } from '../location/AgriLocationPicker';
import { MapPin, Edit3, Trash2, Plus, Compass, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { isValidCoordinate } from '../map/mapConfig';

export interface FarmLocationData {
  addressLine?: string;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FarmLocationManagerProps {
  farmName?: string;
  cropTypes?: string[];
  locationData: FarmLocationData;
  onSaveLocation: (updatedLocation: Required<FarmLocationData>) => Promise<void>;
  onRemoveLocation?: () => Promise<void>;
  isFarmer: boolean;
  disabled?: boolean;
}

export const FarmLocationManager: React.FC<FarmLocationManagerProps> = ({
  farmName = 'My Farm Land',
  cropTypes = [],
  locationData,
  onSaveLocation,
  onRemoveLocation,
  isFarmer,
  disabled = false,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const hasValidCoordinates = isValidCoordinate(locationData.latitude, locationData.longitude);

  const lat = hasValidCoordinates && locationData.latitude ? locationData.latitude : 31.634;
  const lng = hasValidCoordinates && locationData.longitude ? locationData.longitude : 75.8573;

  // Handle location picker confirmation
  const handleConfirmLocation = async (selected: SelectedLocationData) => {
    if (!isFarmer) {
      setFeedback({ type: 'error', message: 'Unauthorized: Worker profiles cannot modify farmer farm locations.' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const payload: Required<FarmLocationData> = {
        addressLine: selected.addressLine || locationData.addressLine || '',
        village: selected.village || locationData.village || '',
        district: selected.district || locationData.district || 'Amritsar',
        state: selected.state || locationData.state || 'Punjab',
        country: selected.country || 'India',
        pincode: selected.pincode || locationData.pincode || '',
        latitude: selected.latitude,
        longitude: selected.longitude,
      };

      await onSaveLocation(payload);
      setFeedback({ type: 'success', message: 'Farm location successfully updated and saved to profile.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save farm location.' });
    } finally {
      setIsSaving(false);
      setIsPickerOpen(false);
    }
  };

  // Handle location removal
  const handleRemove = async () => {
    if (!isFarmer) {
      setFeedback({ type: 'error', message: 'Unauthorized: Worker profiles cannot modify farmer farm locations.' });
      return;
    }

    if (!window.confirm('Are you sure you want to remove this farm location from your profile?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setFeedback(null);

      if (onRemoveLocation) {
        await onRemoveLocation();
      } else {
        await onSaveLocation({
          addressLine: '',
          village: '',
          district: 'Amritsar',
          state: 'Punjab',
          country: 'India',
          pincode: '',
          latitude: 0,
          longitude: 0,
        });
      }

      setFeedback({ type: 'success', message: 'Farm location removed from profile.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove location.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">Farm Location & Geospatial Map</h3>
            <p className="text-xs text-slate-500">Manage exact GPS coordinates and Leaflet map location of your farm</p>
          </div>
        </div>

        {/* Action Controls (Farmer Only) */}
        {isFarmer && !disabled && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-soft-sm flex items-center space-x-1.5 transition-all active:scale-95"
            >
              {hasValidCoordinates ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{hasValidCoordinates ? 'Edit Farm Location' : 'Add Farm Location'}</span>
            </button>

            {hasValidCoordinates && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isDeleting}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
                title="Remove Farm Location"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Non-Farmer Permission Alert */}
      {!isFarmer && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Worker profiles can view farm locations on maps, but are restricted from modifying farmer location settings.</span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-medium flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Interactive Map View */}
      {hasValidCoordinates ? (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-72 relative">
            <LocationMap center={[lat, lng]} zoom={14} height="h-72">
              <FarmMarker
                position={[lat, lng]}
                farmName={farmName}
                cropTypes={cropTypes}
                district={locationData.district}
                state={locationData.state}
                pincode={locationData.pincode}
              />
            </LocationMap>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Village / Locality</span>
              <span className="font-bold text-slate-900">{locationData.village || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[10px] uppercase">District & State</span>
              <span className="font-bold text-slate-900">
                {locationData.district || 'Amritsar'}, {locationData.state || 'Punjab'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Pincode</span>
              <span className="font-bold text-slate-900">{locationData.pincode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[10px] uppercase">GPS Coordinates</span>
              <span className="font-mono text-emerald-700 font-bold">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-3 bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">No Farm Location Set</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your farm's GPS coordinates to display your land on Leaflet maps and receive localized worker applications.
            </p>
          </div>
          {isFarmer && !disabled && (
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-soft-sm inline-flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Farm Location</span>
            </button>
          )}
        </div>
      )}

      {/* AgriLocationPickerModal Dialog */}
      <AgriLocationPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        initialLatitude={locationData.latitude}
        initialLongitude={locationData.longitude}
        initialDistrict={locationData.district}
        initialState={locationData.state}
        initialVillage={locationData.village}
        onConfirm={handleConfirmLocation}
        title={`Select Farm Location: ${farmName}`}
      />
    </div>
  );
};
