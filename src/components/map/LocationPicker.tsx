import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { MapContainer } from './MapContainer';
import { MapMarker } from './MapMarker';
import { MapControls } from './MapControls';
import { UserLocationMarker } from './UserLocationMarker';
import { isValidCoordinate, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './mapConfig';
import { Navigation, MapPin, Compass, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from 'axios';

export interface LocationPickerAddressDetails {
  district?: string;
  state?: string;
  village?: string;
  addressLine?: string;
  pincode?: string;
  displayName?: string;
}

export interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  district?: string;
  state?: string;
  village?: string;
  onLocationChange?: (lat: number, lng: number, addressDetails?: LocationPickerAddressDetails) => void;
  height?: string;
  className?: string;
  readOnly?: boolean;
}

// Inner helper component to listen for click events on Leaflet map
const MapClickEvents: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Inner helper component to fly map view when position changes programmatically
const MapFlyTo: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [center, map]);
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  district = '',
  state = '',
  village = '',
  onLocationChange,
  height = 'h-72',
  className = '',
  readOnly = false,
}) => {
  const hasValidProps = isValidCoordinate(latitude, longitude);

  const [currentPos, setCurrentPos] = useState<[number, number]>(() => {
    if (hasValidProps && latitude && longitude) {
      return [latitude, longitude];
    }
    return DEFAULT_MAP_CENTER;
  });

  const [userGps, setUserGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [addressPreview, setAddressPreview] = useState<string>(() => {
    return [village, district, state].filter(Boolean).join(', ') || 'Select a point on the map';
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal position when parent props update
  useEffect(() => {
    if (isValidCoordinate(latitude, longitude) && latitude && longitude) {
      setCurrentPos([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Reverse Geocoding with Nominatim (de-bounced)
  const fetchAddressDetails = useCallback(
    async (lat: number, lng: number) => {
      try {
        setIsGeocoding(true);
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
          timeout: 5000,
        });

        const address = response.data?.address || {};
        const parsedDetails: LocationPickerAddressDetails = {
          district: address.district || address.state_district || address.county || address.city_district || address.city || '',
          state: address.state || '',
          village: address.village || address.town || address.city || address.municipality || address.suburb || address.neighbourhood || address.hamlet || '',
          addressLine: response.data?.name || address.road || '',
          pincode: address.postcode || '',
          displayName: response.data?.display_name || '',
        };

        const previewStr =
          [parsedDetails.village, parsedDetails.district, parsedDetails.state]
            .filter(Boolean)
            .join(', ') || response.data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        setAddressPreview(previewStr);

        if (onLocationChange) {
          onLocationChange(lat, lng, parsedDetails);
        }
      } catch {
        // Fallback preview on network failure
        setAddressPreview(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        if (onLocationChange) {
          onLocationChange(lat, lng);
        }
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationChange]
  );

  const handlePositionUpdate = (lat: number, lng: number, skipReverseGeocode = false) => {
    const formattedLat = Number(lat.toFixed(6));
    const formattedLng = Number(lng.toFixed(6));
    setCurrentPos([formattedLat, formattedLng]);

    if (!skipReverseGeocode) {
      fetchAddressDetails(formattedLat, formattedLng);
    } else if (onLocationChange) {
      onLocationChange(formattedLat, formattedLng);
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setUserGps({ lat, lng, accuracy });
        handlePositionUpdate(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div ref={containerRef} className={`relative rounded-3xl overflow-hidden border border-slate-200 shadow-soft-sm ${className}`}>
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center space-x-2 truncate pr-2">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate font-semibold text-slate-200">
            {isGeocoding ? 'Locating address...' : addressPreview}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isLocating}
            className="shrink-0 font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 active:scale-95 disabled:opacity-50"
          >
            {isLocating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Use Current GPS'}</span>
          </button>
        )}
      </div>

      {/* Leaflet Map Container */}
      <div className={`relative w-full ${height} bg-slate-100`}>
        <MapContainer center={currentPos} zoom={DEFAULT_MAP_ZOOM} className="w-full h-full">
          <MapFlyTo center={currentPos} />
          {!readOnly && (
            <MapClickEvents onMapClick={(lat, lng) => handlePositionUpdate(lat, lng)} />
          )}

          {/* Selected Location Draggable Marker */}
          <MapMarker
            position={currentPos}
            draggable={!readOnly}
            onDragEndEnd={(lat, lng) => handlePositionUpdate(lat, lng)}
          />

          {/* User GPS Pulsing Dot */}
          {userGps && (
            <UserLocationMarker
              latitude={userGps.lat}
              longitude={userGps.lng}
              accuracy={userGps.accuracy}
            />
          )}

          <MapControls containerRef={containerRef} onLocateMe={handleUseGps} />
        </MapContainer>

        {/* Readout coordinates bar */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl text-[11px] font-mono flex items-center space-x-2 shadow-md">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lat: {currentPos[0].toFixed(4)} | Lng: {currentPos[1].toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};
