import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Volume2,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const VoiceCallModal: React.FC = () => {
  const {
    callState,
    activeCall,
    formattedDuration,
    isMuted,
    statusMessage,
    errorMessage,
    cancelCall,
    endCall,
    toggleMute,
    clearCallState,
  } = useCall();

  if (callState === 'idle' || callState === 'incoming') {
    return null;
  }

  const remoteUser = activeCall?.remoteUser || {
    name: 'Worker',
    role: 'Agricultural Specialist',
    avatar: '',
  };

  const isConnected = callState === 'connected';
  const isCalling = callState === 'calling' || callState === 'requesting-permission';
  const isTerminated =
    callState === 'ended' ||
    callState === 'rejected' ||
    callState === 'busy' ||
    callState === 'timeout' ||
    callState === 'failed';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center text-white space-y-6 relative overflow-hidden"
        >
          {/* Subtle Ambient Background Gradients */}
          {isConnected && (
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          )}
          {isCalling && (
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          )}
          {isTerminated && (
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          )}

          {/* Modal Header */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs font-bold">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">Connected</span>
                </>
              ) : isCalling ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-300">Calling...</span>
                </>
              ) : (
                <span className="text-slate-400">Call Finished</span>
              )}
            </div>

            {isTerminated && (
              <button
                type="button"
                onClick={clearCallState}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Profile Display */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {isCalling && (
                <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              )}
              {isConnected && (
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
              )}
              <div className="w-24 h-24 rounded-full bg-slate-800 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl overflow-hidden border-4 border-slate-700 relative z-10">
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
              <p className="text-xs font-semibold text-slate-400 capitalize mt-0.5">
                {remoteUser.role || 'Agricultural Specialist'}
              </p>
            </div>
          </div>

          {/* Call Status / Duration Counter */}
          <div className="space-y-1">
            {isConnected ? (
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-lg font-bold text-white tracking-wider">
                  {formattedDuration}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
                {errorMessage ? (
                  <div className="flex items-center justify-center space-x-1.5 text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : (
                  <p className="text-slate-300 font-medium">{statusMessage || 'Connecting...'}</p>
                )}
              </div>
            )}
          </div>

          {/* Action Control Buttons */}
          <div className="pt-2">
            {isConnected && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
                    isMuted
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-4 h-4 text-amber-400" />
                      <span>Unmute</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Mute</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={endCall}
                  className="flex items-center justify-center space-x-2 py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-extrabold text-sm transition-all active:scale-95 shadow-xl shadow-rose-950/50"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </div>
            )}

            {isCalling && (
              <button
                type="button"
                onClick={cancelCall}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-2xl font-bold text-sm transition-all active:scale-95"
              >
                <PhoneOff className="w-4 h-4 text-rose-400" />
                <span>Cancel Call</span>
              </button>
            )}

            {isTerminated && (
              <button
                type="button"
                onClick={clearCallState}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-sm transition-all"
              >
                Back to Details
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
