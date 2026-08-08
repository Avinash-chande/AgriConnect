import React, { useState, useEffect, useCallback } from 'react';
import { LocationSearchInput, LocationSearchResult } from './LocationSearchInput';
import { LocationPicker } from '../map/LocationPicker';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { isValidCoordinate, DEFAULT_MAP_CENTER } from '../map/mapConfig';
import { MapPin, Navigation, Compass, Check, X, RotateCcw, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

export interface SelectedLocationData {
  latitude: number;
  longitude: number;
  addressLine?: string;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  formattedAddress?: string;
}

export interface AgriLocationPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialDistrict?: string;
  initialState?: string;
  initialVillage?: string;
  onConfirm?: (locationData: SelectedLocationData) => void;
  onCancel?: () => void;
  onReset?: () => void;
  height?: string;
  className?: string;
  title?: string;
}

export const AgriLocationPicker: React.FC<AgriLocationPickerProps> = ({
  initialLatitude,
  initialLongitude,
  initialDistrict = '',
  initialState = '',
  initialVillage = '',
  onConfirm,
  onCancel,
  onReset,
  height = 'h-80',
  className = '',
  title = 'Select Farm or Job Geolocation',
}) => {
  const defaultPos = isValidCoordinate(initialLatitude, initialLongitude) && initialLatitude && initialLongitude
    ? ([initialLatitude, initialLongitude] as [number, number])
    : DEFAULT_MAP_CENTER;

  const [currentLat, setCurrentLat] = useState<number>(defaultPos[0]);
  const [currentLng, setCurrentLng] = useState<number>(defaultPos[1]);

  const [addressLine, setAddressLine] = useState<string>('');
  const [village, setVillage] = useState<string>(initialVillage);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [stateName, setStateName] = useState<string>(initialState);
  const [countryName, setCountryName] = useState<string>('India');
  const [pincode, setPincode] = useState<string>('');
  const [formattedAddress, setFormattedAddress] = useState<string>('');

  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({ autoFetch: false });

  // Reverse Geocoding with Nominatim (debounced & safe)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!isValidCoordinate(lat, lng)) {
      setValidationError('Invalid coordinates. Latitude must be -90 to 90 and Longitude -180 to 180.');
      return;
    }

    setValidationError(null);
    setIsGeocoding(true);

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat,
          lon: lng,
          addressdetails: 1,
        },
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 6000,
      });

      const addr = response.data?.address || {};
      const dist = addr.state_district || addr.county || addr.district || addr.city || '';
      const st = addr.state || '';
      const vil = addr.village || addr.suburb || addr.town || addr.hamlet || '';
      const line = response.data?.name || addr.road || '';
      const pin = addr.postcode || '';
      const count = addr.country || 'India';
      const disp = response.data?.display_name || [line, vil, dist, st, count, pin].filter(Boolean).join(', ');

      setDistrict(dist);
      setStateName(st);
      setVillage(vil);
      setAddressLine(line);
      setPincode(pin);
      setCountryName(count);
      setFormattedAddress(disp);
    } catch {
      // Fallback format on network failure
      const fallbackDisp = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setFormattedAddress(fallbackDisp);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Update internal coordinates
  const handleUpdateCoordinates = (lat: number, lng: number, skipReverse = false) => {
    if (!isValidCoordinate(lat, lng)) {
      setValidationError('Coordinates out of range (-90..90 lat, -180..180 lng).');
      return;
    }

    setValidationError(null);
    setCurrentLat(Number(lat.toFixed(6)));
    setCurrentLng(Number(lng.toFixed(6)));

    if (!skipReverse) {
      reverseGeocode(lat, lng);
    }
  };

  // Search autocomplete result handler
  const handleSelectSearchResult = (result: LocationSearchResult) => {
    handleUpdateCoordinates(result.latitude, result.longitude, true);
    if (result.district) setDistrict(result.district);
    if (result.state) setStateName(result.state);
    if (result.village) setVillage(result.village);
    if (result.addressLine) setAddressLine(result.addressLine);
    if (result.pincode) setPincode(result.pincode);
    if (result.country) setCountryName(result.country);
    setFormattedAddress(result.displayName);
  };

  // GPS Location button click handler
  const handleUseGps = async () => {
    const res = await getGpsLocation();
    if (res && res.coordinates) {
      handleUpdateCoordinates(res.coordinates.latitude, res.coordinates.longitude);
    }
  };

  // Reset to initial location or Amritsar default
  const handleReset = () => {
    const resetLat = defaultPos[0];
    const resetLng = defaultPos[1];
    setCurrentLat(resetLat);
    setCurrentLng(resetLng);
    setDistrict(initialDistrict);
    setStateName(initialState);
    setVillage(initialVillage);
    reverseGeocode(resetLat, resetLng);

    if (onReset) {
      onReset();
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (!isValidCoordinate(currentLat, currentLng)) {
      setValidationError('Invalid coordinates. Please select a valid location on the map.');
      return;
    }

    const payload: SelectedLocationData = {
      latitude: currentLat,
      longitude: currentLng,
      addressLine,
      village,
      district,
      state: stateName,
      country: countryName,
      pincode,
      formattedAddress: formattedAddress || `${currentLat}, ${currentLng}`,
    };

    if (onConfirm) {
      onConfirm(payload);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-soft-lg overflow-hidden flex flex-col ${className}`}>
      {/* Top Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold font-heading text-sm text-white">{title}</h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isGpsLoading}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors active:scale-95 disabled:opacity-50"
          >
            {isGpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isGpsLoading ? 'Locating...' : 'Use My GPS'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <LocationSearchInput onSelectResult={handleSelectSearchResult} />

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Leaflet Map Picker Component */}
        <LocationPicker
          latitude={currentLat}
          longitude={currentLng}
          district={district}
          state={stateName}
          village={village}
          onLocationChange={(lat, lng) => handleUpdateCoordinates(lat, lng)}
          height={height}
        />

        {/* Coordinate Readout Input Controls */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Latitude (-90 to 90)
            </label>
            <input
              type="number"
              step="any"
              value={currentLat}
              onChange={(e) => handleUpdateCoordinates(parseFloat(e.target.value) || 0, currentLng, true)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Longitude (-180 to 180)
            </label>
            <input
              type="number"
              step="any"
              value={currentLng}
              onChange={(e) => handleUpdateCoordinates(currentLat, parseFloat(e.target.value) || 0, true)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Reverse Geocoded Address Preview */}
        <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/70 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Address Preview</span>
            </span>

            {isGeocoding && (
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Geocoding...</span>
              </span>
            )}
          </div>

          <p className="font-semibold text-slate-800 text-xs leading-relaxed">
            {formattedAddress || `${district}, ${stateName}`}
          </p>

          <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-emerald-200/50">
            <div>
              <span className="text-slate-400 block text-[10px]">District:</span>
              <span className="font-medium text-slate-900 truncate block">{district || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">State:</span>
              <span className="font-medium text-slate-900 truncate block">{stateName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pincode:</span>
              <span className="font-medium text-slate-900 truncate block">{pincode || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-3 py-2 rounded-xl hover:bg-slate-200/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Location</span>
        </button>

        <div className="flex items-center space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-soft-sm flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
