import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, X, Clock, AlertCircle, Check, Navigation } from 'lucide-react';
import axios from 'axios';

export interface LocationAutocompleteResult {
  placeName: string;
  address?: string;
  village?: string;
  district: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  type?: string;
}

export interface LocationAutocompleteProps {
  placeholder?: string;
  initialValue?: string;
  onSelectLocation: (location: LocationAutocompleteResult) => void;
  className?: string;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
}

const RECENT_SEARCHES_KEY = 'agri_recent_location_searches';
const MAX_RECENT_ITEMS = 5;

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  placeholder = 'Search village, district, pincode or state...',
  initialValue = '',
  onSelectLocation,
  className = '',
  minChars = 3,
  debounceMs = 350,
  disabled = false,
}) => {
  const [query, setQuery] = useState<string>(initialValue);
  const [results, setResults] = useState<LocationAutocompleteResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<LocationAutocompleteResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save selected item to recent searches
  const saveToRecentSearches = (item: LocationAutocompleteResult) => {
    try {
      const filtered = recentSearches.filter(
        (r) => r.formattedAddress.toLowerCase() !== item.formattedAddress.toLowerCase()
      );
      const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Perform API Autocomplete Search with Debounce
  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.trim().length < minChars) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/v1/location/search-autocomplete', {
          params: { q: searchTerm.trim(), limit: 8 },
          timeout: 4500,
        });

        if (response.data?.success && Array.isArray(response.data.data)) {
          setResults(response.data.data);
          setIsOpen(true);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        setError('Unable to fetch locations. Please check your query or pick location on map.');
        setResults([]);
      } fontFinally: {
        setLoading(false);
      }
    },
    [minChars]
  );

  // Handle Input Change with Debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length >= minChars) {
      setLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, debounceMs);
    } else {
      setResults([]);
      setLoading(false);
      setError(null);
      setIsOpen(true);
    }
  };

  // Keyboard Navigation: ArrowUp, ArrowDown, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listToNavigate = query.trim().length < minChars ? recentSearches : results;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev < listToNavigate.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : listToNavigate.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < listToNavigate.length) {
        handleSelectItem(listToNavigate[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (item: LocationAutocompleteResult) => {
    setQuery(item.formattedAddress || item.placeName);
    setIsOpen(false);
    saveToRecentSearches(item);
    onSelectLocation(item);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full text-left font-sans ${className}`}>
      {/* Search Input Field */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs sm:text-sm font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner disabled:opacity-50"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800/60 backdrop-blur-xl">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt: Type Min Chars & Recent Searches */}
          {query.trim().length < minChars && (
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Type at least {minChars} characters to search places
              </span>

              {recentSearches.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 pb-1">
                    <Clock className="w-3 h-3" />
                    <span>Recent Searches</span>
                  </div>
                  {recentSearches.map((item, idx) => (
                    <div
                      key={`recent-${idx}`}
                      onClick={() => handleSelectItem(item)}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedIndex === idx ? 'bg-emerald-500/20 text-white' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{item.placeName || item.formattedAddress}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                        {item.district}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Results List */}
          {query.trim().length >= minChars && !loading && results.length > 0 && (
            <div className="py-1">
              {results.map((item, idx) => (
                <div
                  key={`res-${idx}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 text-xs cursor-pointer transition-colors flex items-start space-x-3 ${
                    selectedIndex === idx ? 'bg-emerald-500/20 text-white' : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs truncate">
                        {[item.village, item.district].filter(Boolean).join(', ') || item.placeName}
                      </span>
                      {item.type && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 uppercase shrink-0 ml-2">
                          {item.type}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate leading-snug">
                      {item.formattedAddress || item.placeName}
                    </p>

                    {item.pincode && (
                      <span className="text-[10px] text-slate-500 block">PIN: {item.pincode}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Results State */}
          {query.trim().length >= minChars && !loading && results.length === 0 && !error && (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching locations found for "{query}". Try entering village name or PIN.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
