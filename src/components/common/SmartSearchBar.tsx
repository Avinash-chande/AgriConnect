import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Sprout, Briefcase, Award, User, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { jobService } from '../../services/jobService';
import type { AutocompleteResult } from '../../services/jobService';
import { HighlightText } from './HighlightText';

interface SmartSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  placeholder = 'Search by Job Title, Crop, Location, Skill, or Farmer Name...',
  initialValue = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(searchTerm, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Autocomplete Suggestions on debounced query change
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setSuggestions(null);
      setIsOpen(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const res = await jobService.getAutocomplete(debouncedQuery);
        setSuggestions(res);
        setIsOpen(true);
      } catch {
        setSuggestions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (value: string) => {
    setSearchTerm(value);
    setIsOpen(false);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions(null);
    setIsOpen(false);
    onSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearch(searchTerm);
  };

  const hasSuggestions =
    suggestions &&
    (suggestions.titles.length > 0 ||
      suggestions.crops.length > 0 ||
      suggestions.skills.length > 0 ||
      suggestions.locations.length > 0 ||
      suggestions.farmers.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 text-emerald-400">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => hasSuggestions && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xl transition-all"
        />

        {loading ? (
          <div className="absolute right-4 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </form>

      {/* Autocomplete Dropdown List */}
      {isOpen && hasSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
          {/* Titles */}
          {suggestions.titles.length > 0 && (
            <div className="p-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Job Titles</span>
              </div>
              {suggestions.titles.map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(title)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-between"
                >
                  <HighlightText text={title} query={debouncedQuery} />
                </button>
              ))}
            </div>
          )}

          {/* Crops */}
          {suggestions.crops.length > 0 && (
            <div className="p-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <Sprout className="w-3.5 h-3.5" />
                <span>Crop Types</span>
              </div>
              {suggestions.crops.map((crop, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(crop)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <HighlightText text={crop} query={debouncedQuery} />
                </button>
              ))}
            </div>
          )}

          {/* Skills */}
          {suggestions.skills.length > 0 && (
            <div className="p-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <Award className="w-3.5 h-3.5" />
                <span>Required Skills</span>
              </div>
              {suggestions.skills.map((skill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(skill)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <HighlightText text={skill} query={debouncedQuery} />
                </button>
              ))}
            </div>
          )}

          {/* Locations */}
          {suggestions.locations.length > 0 && (
            <div className="p-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Locations</span>
              </div>
              {suggestions.locations.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(loc)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <HighlightText text={loc} query={debouncedQuery} />
                </button>
              ))}
            </div>
          )}

          {/* Farmers */}
          {suggestions.farmers.length > 0 && (
            <div className="p-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <User className="w-3.5 h-3.5" />
                <span>Farmers</span>
              </div>
              {suggestions.farmers.map((farmer, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(farmer)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <HighlightText text={farmer} query={debouncedQuery} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
