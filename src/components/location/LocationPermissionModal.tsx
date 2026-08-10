import React, { useState } from 'react';
import {
  ShieldCheck,
  MapPin,
  Navigation,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  X,
  Compass,
  Search,
  Loader2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import axios from 'axios';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';

export interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllowLocation?: (coords: { latitude: number; longitude: number }) => void;
  onUseManualLocation?: () => void;
  onDeleteSavedLocation?: () => void;
  currentVisibility?: 'private' | 'approximate' | 'verified_users' | 'public';
  onUpdateVisibility?: (newVisibility: 'private' | 'approximate' | 'verified_users' | 'public') => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllowLocation,
  onUseManualLocation,
  onDeleteSavedLocation,
  currentVisibility = 'approximate',
  onUpdateVisibility,
}) => {
  const [visibility, setVisibility] = useState<'private' | 'approximate' | 'verified_users' | 'public'>(
    currentVisibility
  );
  const [isUpdatingVis, setIsUpdatingVis] = useState<boolean>(false);
  const [isDeletingLoc, setIsDeletingLoc] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { refetchLocation, loading: isGpsLoading, error: gpsError } = useCurrentLocation({
    autoFetch: false,
  });

  if (!isOpen) return null;

  const handleAllowClick = async () => {
    setFeedbackMsg(null);
    try {
      const coords = await refetchLocation();
      if (coords) {
        if (onAllowLocation) onAllowLocation(coords as any);
        setFeedbackMsg({ type: 'success', text: 'GPS Location detected successfully.' });
        setTimeout(() => onClose(), 1200);
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Unable to access GPS location. Please choose manual location.' });
    }
  };

  const handleSaveVisibility = async (newSetting: 'private' | 'approximate' | 'verified_users' | 'public') => {
    setVisibility(newSetting);
    try {
      setIsUpdatingVis(true);
      setFeedbackMsg(null);
      await axios.put('/api/v1/profiles/location-privacy', { locationVisibility: newSetting });
      if (onUpdateVisibility) onUpdateVisibility(newSetting);
      setFeedbackMsg({ type: 'success', text: `Location visibility updated to ${newSetting}.` });
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to update location privacy settings.' });
    } finally {
      setIsUpdatingVis(false);
    }
  };

  const handleDeleteLocation = async () => {
    try {
      setIsDeletingLoc(true);
      setFeedbackMsg(null);
      await axios.delete('/api/v1/profiles/saved-location');
      if (onDeleteSavedLocation) onDeleteSavedLocation();
      setFeedbackMsg({ type: 'success', text: 'Saved location deleted from profile.' });
      setTimeout(() => onClose(), 1200);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to delete saved location.' });
    } finally {
      setIsDeletingLoc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-left relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy-First Location Controls</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
            Location Permission & Controls
          </h2>
        </div>

        {/* Transparent Reason Explanation */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
          <p className="font-semibold text-white flex items-center space-x-1.5">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Why is location required?</span>
          </p>
          <p className="leading-relaxed text-slate-400">
            AgriConnect never silently accesses your GPS. Location data is strictly used to display nearby agricultural jobs, calculate route travel distances, and match farmers with local skilled workers.
          </p>
        </div>

        {/* Feedback Message Banner */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center space-x-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Action Buttons: Allow / Deny / Manual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleAllowClick}
            disabled={isGpsLoading}
            className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            {isGpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            <span>{isGpsLoading ? 'Locating...' : 'Allow GPS Location'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onUseManualLocation) onUseManualLocation();
              onClose();
            }}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span>Use Manual Location</span>
          </button>
        </div>

        {/* Visibility Controls Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Profile Location Visibility
            </span>
            {isUpdatingVis && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSaveVisibility('approximate')}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                visibility === 'approximate'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Approximate</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                ~300m randomized offset protects exact home address
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSaveVisibility('private')}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                visibility === 'private'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Private</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Hidden from public searches & map views
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSaveVisibility('verified_users')}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                visibility === 'verified_users'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Verified Users</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Visible only to logged-in verified farmers/employers
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSaveVisibility('public')}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                visibility === 'public'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Public Exact</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Exact coordinates visible on job map
              </p>
            </button>
          </div>
        </div>

        {/* Footer: Delete Saved Location Option */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleDeleteLocation}
            disabled={isDeletingLoc}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {isDeletingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Delete Saved Location</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
