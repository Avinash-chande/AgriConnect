import { usePresence as usePresenceContext } from '../context/PresenceContext';
import type { PresenceContextType } from '../context/PresenceContext';

/**
 * Custom hook to consume real-time User Presence context
 */
export const usePresence = (): PresenceContextType => {
  return usePresenceContext();
};
