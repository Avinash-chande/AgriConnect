/**
 * AgriConnect Voice Call Context & State Provider
 * Provides unified state management for browser-to-browser WebRTC voice calling,
 * active duration timer, mute toggling, incoming call handling, and cleanup.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { socketService } from '../services/socketService';
import { webrtcService } from '../services/webrtcService';
import { useAuth } from './AuthContext';

export type CallState =
  | 'idle'
  | 'requesting-permission'
  | 'calling'
  | 'incoming'
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'busy'
  | 'timeout'
  | 'failed';

export interface CallRemoteUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface CallSessionData {
  callId: string;
  remoteUser: CallRemoteUser;
  isIncoming: boolean;
  status: CallState;
}

export interface InitiateCallParams {
  receiverId: string;
  receiverName: string;
  receiverRole?: string;
  receiverAvatar?: string;
}

export interface CallContextType {
  callState: CallState;
  activeCall: CallSessionData | null;
  duration: number;
  formattedDuration: string;
  isMuted: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  initiateCall: (params: InitiateCallParams) => Promise<boolean>;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  clearCallState: () => void;
}

const CallContext = createContext<CallContextType>({
  callState: 'idle',
  activeCall: null,
  duration: 0,
  formattedDuration: '00:00',
  isMuted: false,
  statusMessage: null,
  errorMessage: null,
  initiateCall: async () => false,
  acceptCall: async () => false,
  rejectCall: () => { },
  cancelCall: () => { },
  endCall: () => { },
  toggleMute: () => { },
  clearCallState: () => { },
});

export const useCall = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<CallSessionData | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCallRef = useRef<CallSessionData | null>(null);

  // Keep ref synchronized for callbacks
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Format seconds into MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clear auto-dismiss timer helper
  const clearAutoDismiss = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  };

  // Schedule auto-dismiss transition to idle
  const scheduleAutoDismiss = (delayMs = 2500) => {
    clearAutoDismiss();
    autoDismissTimerRef.current = setTimeout(() => {
      clearCallState();
    }, delayMs);
  };

  // Full state reset & WebRTC cleanup
  const clearCallState = useCallback(() => {
    clearAutoDismiss();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    webrtcService.cleanup();
    setCallState('idle');
    setActiveCall(null);
    setDuration(0);
    setIsMuted(false);
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  // Duration Timer: Runs only when connected
  useEffect(() => {
    if (callState === 'connected') {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setDuration(0);
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Handle local ICE candidates and send via socket
  const handleIceCandidate = useCallback((candidate: RTCIceCandidate) => {
    const current = activeCallRef.current;
    const socket = socketService.getSocket();
    if (current && socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
        callId: current.callId,
        candidate,
      });
    }
  }, []);

  // 1. INITIATE CALL (Farmer -> Worker)
  const initiateCall = async (params: InitiateCallParams): Promise<boolean> => {
    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      setErrorMessage('Real-time connection is not active. Please check your internet connection.');
      return false;
    }

    if (!user) {
      setErrorMessage('You must be signed in to make a voice call.');
      return false;
    }

    clearAutoDismiss();
    setErrorMessage(null);
    setCallState('requesting-permission');
    setStatusMessage(`Requesting microphone access...`);

    try {
      // 1. Request microphone access
      await webrtcService.getLocalAudioStream();

      setCallState('calling');
      setStatusMessage(`Calling ${params.receiverName}...`);

      // 2. Emit call initiate to backend
      return new Promise<boolean>((resolve) => {
        socket.emit(
          SOCKET_EVENTS.CALL_INITIATE,
          { receiverId: params.receiverId },
          (res: any) => {
            if (!res || !res.success) {
              const reason = res?.data?.reason;
              const msg = res?.message || 'Failed to initiate call';

              if (reason === 'offline') {
                setCallState('failed');
                setStatusMessage('Worker is currently offline.');
              } else if (reason === 'busy') {
                setCallState('busy');
                setStatusMessage('Worker is currently on another call.');
              } else {
                setCallState('failed');
                setStatusMessage(msg);
              }
              setErrorMessage(msg);
              webrtcService.cleanup();
              scheduleAutoDismiss(3000);
              resolve(false);
              return;
            }

            const sessionData: CallSessionData = {
              callId: res.data.callId,
              remoteUser: {
                id: params.receiverId,
                name: params.receiverName,
                role: params.receiverRole || 'Worker',
                avatar: params.receiverAvatar || '',
              },
              isIncoming: false,
              status: 'calling',
            };

            setActiveCall(sessionData);
            resolve(true);
          }
        );
      });
    } catch (err: any) {
      setCallState('failed');
      const errText = err.message || 'Microphone access denied';
      setErrorMessage(errText);
      setStatusMessage(errText);
      webrtcService.cleanup();
      scheduleAutoDismiss(4000);
      return false;
    }
  };

  // 2. ACCEPT CALL (Worker -> Farmer)
  const acceptCall = async (): Promise<boolean> => {
    const current = activeCallRef.current;
    const socket = socketService.getSocket();
    if (!current || !socket || !socket.connected) return false;

    clearAutoDismiss();
    setCallState('requesting-permission');
    setStatusMessage('Connecting audio...');

    try {
      // 1. Request local microphone access
      await webrtcService.getLocalAudioStream();

      // 2. Create WebRTC PeerConnection for Worker
      webrtcService.createPeerConnection({
        onIceCandidate: handleIceCandidate,
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setCallState('connected');
            setStatusMessage('Connected');
          } else if (state === 'disconnected' || state === 'failed') {
            setCallState('ended');
            setStatusMessage('Connection lost');
            scheduleAutoDismiss(2000);
          }
        },
      });

      // 3. Emit accept event to signaling server
      socket.emit(SOCKET_EVENTS.CALL_ACCEPT, { callId: current.callId });
      setCallState('connected');
      setStatusMessage('Connected');
      return true;
    } catch (err: any) {
      setCallState('failed');
      const errText = err.message || 'Failed to access microphone';
      setErrorMessage(errText);
      setStatusMessage(errText);
      webrtcService.cleanup();
      scheduleAutoDismiss(3000);
      return false;
    }
  };

  // 3. REJECT CALL (Worker declines)
  const rejectCall = () => {
    const current = activeCallRef.current;
    const socket = socketService.getSocket();
    if (current && socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.CALL_REJECT, {
        callId: current.callId,
        reason: 'Worker declined the call',
      });
    }
    clearCallState();
  };

  // 4. CANCEL CALL (Farmer cancels while ringing)
  const cancelCall = () => {
    const current = activeCallRef.current;
    const socket = socketService.getSocket();
    if (current && socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.CALL_CANCEL, {
        callId: current.callId,
      });
    }
    clearCallState();
  };

  // 5. END CALL (Either party terminates)
  const endCall = () => {
    const current = activeCallRef.current;
    const socket = socketService.getSocket();
    if (current && socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.CALL_END, {
        callId: current.callId,
        reason: 'Call ended by user',
      });
    }
    webrtcService.cleanup();
    setCallState('ended');
    setStatusMessage('Call ended');
    scheduleAutoDismiss(1500);
  };

  // 6. TOGGLE MUTE
  const toggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  // ------------------- SOCKET SIGNALING EVENT SUBSCRIPTIONS -------------------
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // 1. Incoming Call (Receiver)
    const handleIncoming = (data: any) => {
      if (!data || !data.callId || !data.caller) return;
      clearAutoDismiss();
      const sessionData: CallSessionData = {
        callId: data.callId,
        remoteUser: {
          id: data.caller.id,
          name: data.caller.name,
          role: data.caller.role || 'Farmer',
          avatar: data.caller.avatar || '',
        },
        isIncoming: true,
        status: 'incoming',
      };
      setActiveCall(sessionData);
      setCallState('incoming');
      setStatusMessage(`Incoming voice call from ${data.caller.name}`);
    };

    // 2. Call Accepted (Caller / Farmer receives confirmation)
    const handleAccepted = async (data: any) => {
      const current = activeCallRef.current;
      if (!current || current.callId !== data.callId) return;

      try {
        setStatusMessage('Connecting audio stream...');

        // Initialize PeerConnection on Farmer side
        webrtcService.createPeerConnection({
          onIceCandidate: handleIceCandidate,
          onConnectionStateChange: (state) => {
            if (state === 'connected') {
              setCallState('connected');
              setStatusMessage('Connected');
            } else if (state === 'disconnected' || state === 'failed') {
              setCallState('ended');
              setStatusMessage('Connection lost');
              scheduleAutoDismiss(2000);
            }
          },
        });

        // Create & send WebRTC offer
        const offer = await webrtcService.createOffer();
        socket.emit(SOCKET_EVENTS.CALL_OFFER, {
          callId: current.callId,
          offer,
        });

        setCallState('connected');
        setStatusMessage('Connected');
      } catch (err: any) {
        setCallState('failed');
        setStatusMessage('WebRTC negotiation failed');
        webrtcService.cleanup();
        scheduleAutoDismiss(3000);
      }
    };

    // 3. WebRTC Offer Received (Worker receives offer from Farmer)
    const handleOffer = async (data: any) => {
      const current = activeCallRef.current;
      if (!current || current.callId !== data.callId || !data.offer) return;

      try {
        const answer = await webrtcService.handleOfferAndCreateAnswer(data.offer);
        socket.emit(SOCKET_EVENTS.CALL_ANSWER, {
          callId: current.callId,
          answer,
        });
        setCallState('connected');
        setStatusMessage('Connected');
      } catch (err: any) {
        setCallState('failed');
        setStatusMessage('Failed to answer audio stream');
        webrtcService.cleanup();
        scheduleAutoDismiss(3000);
      }
    };

    // 4. WebRTC Answer Received (Farmer receives answer from Worker)
    const handleAnswer = async (data: any) => {
      const current = activeCallRef.current;
      if (!current || current.callId !== data.callId || !data.answer) return;

      try {
        await webrtcService.handleAnswer(data.answer);
        setCallState('connected');
        setStatusMessage('Connected');
      } catch (err: any) {
        console.error('[CallContext] Error setting remote answer:', err);
      }
    };

    // 5. ICE Candidate Received
    const handleIceCandidateReceived = async (data: any) => {
      const current = activeCallRef.current;
      if (!current || current.callId !== data.callId || !data.candidate) return;
      await webrtcService.addIceCandidate(data.candidate);
    };

    // 6. Call Rejected
    const handleRejected = (data: any) => {
      setCallState('rejected');
      setStatusMessage(data?.reason || 'Call rejected by worker');
      webrtcService.cleanup();
      scheduleAutoDismiss(2500);
    };

    // 7. Call Cancelled
    const handleCancelled = (data: any) => {
      setCallState('ended');
      setStatusMessage(data?.reason || 'Call cancelled');
      webrtcService.cleanup();
      scheduleAutoDismiss(2000);
    };

    // 8. Call Ended
    const handleEnd = (data: any) => {
      setCallState('ended');
      setStatusMessage(data?.reason || 'Call ended');
      webrtcService.cleanup();
      scheduleAutoDismiss(1500);
    };

    // 9. Call Timeout
    const handleTimeout = (data: any) => {
      setCallState('timeout');
      setStatusMessage(data?.message || 'Calling timed out.');
      webrtcService.cleanup();
      scheduleAutoDismiss(2500);
    };

    // 10. Call Busy
    const handleBusy = (data: any) => {
      setCallState('busy');
      setStatusMessage(data?.message || 'Worker is currently on another call.');
      webrtcService.cleanup();
      scheduleAutoDismiss(2500);
    };

    // 11. Call Unavailable
    const handleUnavailable = (data: any) => {
      setCallState('failed');
      setStatusMessage(data?.message || 'Worker is currently offline.');
      webrtcService.cleanup();
      scheduleAutoDismiss(2500);
    };

    socket.on(SOCKET_EVENTS.CALL_INCOMING, handleIncoming);
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleAccepted);
    socket.on(SOCKET_EVENTS.CALL_OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.CALL_ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidateReceived);
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleRejected);
    socket.on(SOCKET_EVENTS.CALL_CANCELLED, handleCancelled);
    socket.on(SOCKET_EVENTS.CALL_END, handleEnd);
    socket.on(SOCKET_EVENTS.CALL_TIMEOUT, handleTimeout);
    socket.on(SOCKET_EVENTS.CALL_BUSY, handleBusy);
    socket.on(SOCKET_EVENTS.CALL_UNAVAILABLE, handleUnavailable);

    return () => {
      socket.off(SOCKET_EVENTS.CALL_INCOMING, handleIncoming);
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleAccepted);
      socket.off(SOCKET_EVENTS.CALL_OFFER, handleOffer);
      socket.off(SOCKET_EVENTS.CALL_ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidateReceived);
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleRejected);
      socket.off(SOCKET_EVENTS.CALL_CANCELLED, handleCancelled);
      socket.off(SOCKET_EVENTS.CALL_END, handleEnd);
      socket.off(SOCKET_EVENTS.CALL_TIMEOUT, handleTimeout);
      socket.off(SOCKET_EVENTS.CALL_BUSY, handleBusy);
      socket.off(SOCKET_EVENTS.CALL_UNAVAILABLE, handleUnavailable);
    };
  }, [handleIceCandidate]);

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        duration,
        formattedDuration: formatDuration(duration),
        isMuted,
        statusMessage,
        errorMessage,
        initiateCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        clearCallState,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
