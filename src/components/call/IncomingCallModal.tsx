import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, PhoneCall, User } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallModal: React.FC = () => {
  const { callState, activeCall, acceptCall, rejectCall } = useCall();

  if (callState !== 'incoming' || !activeCall) {
    return null;
  }

  const { remoteUser } = activeCall;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-center text-white space-y-6 relative overflow-hidden"
        >
          {/* Subtle Ringing Background Glow */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="space-y-1">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-xs">
              <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
              <span>Incoming Voice Call</span>
            </span>
          </div>

          {/* Caller Profile Display */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {/* Pulsing Animated Wave */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl overflow-hidden border-4 border-emerald-400 relative z-10">
                {remoteUser.avatar ? (
                  <img
                    src={remoteUser.avatar}
                    alt={remoteUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{remoteUser.name ? remoteUser.name.charAt(0).toUpperCase() : <User className="w-10 h-10" />}</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white font-heading tracking-tight">
                {remoteUser.name}
              </h3>
              <p className="text-xs font-semibold text-emerald-400/90 capitalize mt-0.5">
                {remoteUser.role || 'Farmer'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            AgriConnect Browser Audio Call
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={rejectCall}
              className="flex items-center justify-center space-x-2 py-3.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
              <span>Reject</span>
            </button>

            <button
              type="button"
              onClick={acceptCall}
              className="flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-extrabold text-sm transition-all active:scale-95 shadow-xl shadow-emerald-950/40"
            >
              <Phone className="w-4 h-4 text-slate-950 fill-current" />
              <span>Accept</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
