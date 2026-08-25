/**
 * AgriConnect In-Memory Call Session Store
 * Tracks active WebRTC signaling voice call sessions between Farmers and Workers.
 * Audio is NEVER stored or processed here; only ephemeral signaling session state.
 */

class CallSessionStore {
  constructor() {
    // Map of callId (string) -> session object
    this.sessions = new Map();
    // Map of userId (string) -> callId (string)
    this.userToCall = new Map();
    // Map of callId (string) -> timeout timer ID
    this.timers = new Map();
  }

  /**
   * Check if a user is currently participating in an active or ringing call
   */
  isUserInCall(userId) {
    if (!userId) return false;
    const uId = userId.toString();
    const callId = this.userToCall.get(uId);
    if (!callId) return false;
    const session = this.sessions.get(callId);
    if (!session) {
      this.userToCall.delete(uId);
      return false;
    }
    return ['ringing', 'accepted', 'connected'].includes(session.status);
  }

  /**
   * Get active call session for a user
   */
  getUserActiveCall(userId) {
    if (!userId) return null;
    const uId = userId.toString();
    const callId = this.userToCall.get(uId);
    if (!callId) return null;
    return this.sessions.get(callId) || null;
  }

  /**
   * Get session by callId
   */
  getSession(callId) {
    return this.sessions.get(callId) || null;
  }

  /**
   * Create a new temporary call session with a 30-second ringing timeout
   */
  createSession({
    callId,
    callerId,
    receiverId,
    callerInfo = {},
    receiverInfo = {},
    timeoutMs = 30000,
    onTimeout = null,
  }) {
    const cId = callerId.toString();
    const rId = receiverId.toString();

    // Clean up any stale sessions for these users first
    this.endUserCall(cId);
    this.endUserCall(rId);

    const session = {
      callId,
      callerId: cId,
      receiverId: rId,
      callerInfo: {
        id: cId,
        name: callerInfo.name || 'Caller',
        role: callerInfo.role || 'Farmer',
        avatar: callerInfo.avatar || callerInfo.profileImage || '',
      },
      receiverInfo: {
        id: rId,
        name: receiverInfo.name || 'Worker',
        role: receiverInfo.role || 'Worker',
        avatar: receiverInfo.avatar || receiverInfo.profileImage || '',
      },
      status: 'ringing', // 'ringing' | 'accepted' | 'connected' | 'ended' | 'rejected' | 'cancelled' | 'timeout'
      createdAt: new Date(),
      connectedAt: null,
      endedAt: null,
    };

    this.sessions.set(callId, session);
    this.userToCall.set(cId, callId);
    this.userToCall.set(rId, callId);

    // Setup 30s ringing timeout
    if (timeoutMs > 0 && typeof onTimeout === 'function') {
      const timer = setTimeout(() => {
        const current = this.sessions.get(callId);
        if (current && current.status === 'ringing') {
          this.endSession(callId, 'timeout');
          onTimeout(session);
        }
      }, timeoutMs);

      this.timers.set(callId, timer);
    }

    return session;
  }

  /**
   * Mark session as connected (transitions from ringing)
   */
  setConnected(callId) {
    const session = this.sessions.get(callId);
    if (!session) return null;

    // Clear ringing timeout
    const timer = this.timers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(callId);
    }

    session.status = 'connected';
    session.connectedAt = new Date();
    return session;
  }

  /**
   * Mark session as accepted
   */
  setAccepted(callId) {
    const session = this.sessions.get(callId);
    if (!session) return null;

    const timer = this.timers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(callId);
    }

    session.status = 'accepted';
    return session;
  }

  /**
   * End a call session by callId
   */
  endSession(callId, finalStatus = 'ended') {
    const session = this.sessions.get(callId);
    if (!session) return null;

    // Clear timeout if any
    const timer = this.timers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(callId);
    }

    session.status = finalStatus;
    session.endedAt = new Date();

    // Clean up mapping
    this.userToCall.delete(session.callerId);
    this.userToCall.delete(session.receiverId);
    this.sessions.delete(callId);

    return session;
  }

  /**
   * End active call session for a user (e.g. on disconnect or cleanup)
   */
  endUserCall(userId, finalStatus = 'ended') {
    if (!userId) return null;
    const uId = userId.toString();
    const callId = this.userToCall.get(uId);
    if (!callId) return null;
    return this.endSession(callId, finalStatus);
  }

  /**
   * Clear all sessions (e.g. server restart)
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.sessions.clear();
    this.userToCall.clear();
  }
}

export const callSessionStore = new CallSessionStore();
