import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Search, MapPin, Loader2, X, AlertCircle } from 'lucide-react';
import axios from 'axios';

export interface LocationSearchResult {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  addressLine?: string;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface LocationSearchInputProps {
  onSelectResult: (result: LocationSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  onSelectResult,
  placeholder = 'Search village, district, state, or PIN code...',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions when debounced query changes
  useEffect(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isSubscribed = true;

    const executeSearch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: debouncedSearchTerm,
            format: 'json',
            addressdetails: 1,
            countrycodes: 'in', // Prioritize Indian regions
            limit: 6,
          },
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 6000,
        });

        if (!isSubscribed) return;

        if (Array.isArray(response.data) && response.data.length > 0) {
          const parsedResults: LocationSearchResult[] = response.data.map((item: any) => {
            const addr = item.address || {};
            return {
              placeId: String(item.place_id || Math.random()),
              displayName: item.display_name,
              latitude: Number(item.lat),
              longitude: Number(item.lon),
              addressLine: item.name || addr.road || '',
              village: addr.village || addr.suburb || fontVillageFallback(addr),
              district: addr.state_district || addr.county || addr.district || addr.city || '',
              state: addr.state || '',
              country: addr.country || 'India',
              pincode: addr.postcode || '',
            };
          });

          setResults(parsedResults);
          setIsOpen(true);
        } else {
          setResults([]);
          setError('No matching location found. Try searching by district or pin code.');
          setIsOpen(true);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        console.warn('Geocoding search failed:', err.message);
        setError('Location search temporarily unavailable. You can click on the map to set location.');
        setResults([]);
        setIsOpen(true);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    executeSearch();

    return () => {
      isSubscribed = false;
    };
  }, [debouncedSearchTerm]);

  const fontVillageFallback = (addr: any) => {
    return addr.town || addr.hamlet || addr.neighbourhood || '';
  };

  const handleSelect = (item: LocationSearchResult) => {
    onSelectResult(item);
    setSearchTerm(item.displayName.split(',')[0]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => (results.length > 0 || error) && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-soft-sm transition-all"
        />

        {isLoading && (
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3.5 pointer-events-none" />
        )}

        {!isLoading && searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-soft-lg z-[1100] max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
          {error && (
            <div className="p-3 text-xs text-slate-600 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {results.map((item) => (
            <button
              key={item.placeId}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-2.5 hover:bg-emerald-50/70 rounded-xl transition-colors flex items-start space-x-2.5 group"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {item.displayName.split(',')[0]}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {item.displayName.split(',').slice(1).join(',').trim()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
