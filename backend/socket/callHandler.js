/**
 * AgriConnect WebRTC Voice Call Signaling Socket Handler
 * Handles secure authentication, routing, and lifecycle events for voice calls.
 * Audio is NEVER stored or processed on the server; WebRTC handles peer-to-peer audio.
 */

import { SOCKET_EVENTS } from './socketEvents.js';
import { callSessionStore } from './callSessionStore.js';
import { connectedUsersStore } from './connectedUsers.js';
import { getUserRoomName, formatSocketResponse } from './socketUtils.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const registerCallHandlers = (io, socket) => {
  const user = socket.user;
  if (!user || !user.id) return;
  const userId = user.id.toString();

  // 1. Initiate Voice Call (Farmer -> Worker)
  socket.on(SOCKET_EVENTS.CALL_INITIATE, async (data, callback) => {
    try {
      const { receiverId } = data || {};

      if (!receiverId) {
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, null, 'Worker User ID is required to initiate a call'));
        }
        return socket.emit(SOCKET_EVENTS.CALL_UNAVAILABLE, { message: 'Worker User ID is required' });
      }

      const rId = receiverId.toString();

      // Prevent calling self
      if (rId === userId) {
        const msg = 'You cannot call yourself';
        if (typeof callback === 'function') return callback(formatSocketResponse(false, null, msg));
        return socket.emit(SOCKET_EVENTS.CALL_UNAVAILABLE, { message: msg });
      }

      // Check caller busy
      if (callSessionStore.isUserInCall(userId)) {
        const msg = 'You are already in another active call';
        if (typeof callback === 'function') return callback(formatSocketResponse(false, null, msg));
        return socket.emit(SOCKET_EVENTS.CALL_BUSY, { message: msg });
      }

      // Check receiver online status
      const isReceiverOnline = connectedUsersStore.isUserOnline(rId);
      if (!isReceiverOnline) {
        const msg = 'Worker is currently offline.';
        logger.info(`📞 Call failed: Receiver ${rId} is offline`);
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, { reason: 'offline' }, msg));
        }
        return socket.emit(SOCKET_EVENTS.CALL_UNAVAILABLE, { reason: 'offline', message: msg });
      }

      // Check receiver busy status
      if (callSessionStore.isUserInCall(rId)) {
        const msg = 'Worker is currently on another call.';
        logger.info(`📞 Call failed: Receiver ${rId} is busy`);
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, { reason: 'busy' }, msg));
        }
        return socket.emit(SOCKET_EVENTS.CALL_BUSY, { reason: 'busy', message: msg });
      }

      // Fetch caller & receiver sanitized profile info
      const [callerDoc, receiverDoc] = await Promise.all([
        User.findById(userId).select('name role profileImage').lean(),
        User.findById(rId).select('name role profileImage').lean(),
      ]);

      if (!receiverDoc) {
        const msg = 'Worker account not found';
        if (typeof callback === 'function') return callback(formatSocketResponse(false, null, msg));
        return socket.emit(SOCKET_EVENTS.CALL_UNAVAILABLE, { message: msg });
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create session with 30-second ringing timeout
      const session = callSessionStore.createSession({
        callId,
        callerId: userId,
        receiverId: rId,
        callerInfo: {
          id: userId,
          name: callerDoc?.name || user.name || 'Farmer',
          role: callerDoc?.role || user.role || 'Farmer',
          avatar: callerDoc?.profileImage || '',
        },
        receiverInfo: {
          id: rId,
          name: receiverDoc.name || 'Worker',
          role: receiverDoc.role || 'Worker',
          avatar: receiverDoc.profileImage || '',
        },
        timeoutMs: 30000,
        onTimeout: (timedOutSession) => {
          logger.info(`⏰ Call ${timedOutSession.callId} timed out after 30s`);
          io.to(getUserRoomName(timedOutSession.callerId)).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId: timedOutSession.callId,
            message: 'Calling timed out. Worker did not answer.',
          });
          io.to(getUserRoomName(timedOutSession.receiverId)).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId: timedOutSession.callId,
            message: 'Missed call',
          });
        },
      });

      logger.info(`📞 Call initiated [${callId}]: ${session.callerInfo.name} (${userId}) -> ${session.receiverInfo.name} (${rId})`);

      // Notify the receiver in their private room
      io.to(getUserRoomName(rId)).emit(SOCKET_EVENTS.CALL_INCOMING, {
        callId,
        caller: session.callerInfo,
        createdAt: session.createdAt,
      });

      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, {
          callId,
          receiver: session.receiverInfo,
          status: 'ringing',
        }));
      }
    } catch (err) {
      logger.error(`📞 Call initiate error: ${err.message}`);
      if (typeof callback === 'function') {
        callback(formatSocketResponse(false, null, 'Failed to initiate call: ' + err.message));
      }
    }
  });

  // 2. Accept Incoming Call (Worker -> Farmer)
  socket.on(SOCKET_EVENTS.CALL_ACCEPT, (data, callback) => {
    try {
      const { callId } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session || session.receiverId !== userId) {
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, null, 'Call session invalid or expired'));
        }
        return;
      }

      callSessionStore.setAccepted(callId);
      logger.info(`📞 Call accepted [${callId}] by receiver ${userId}`);

      // Notify caller
      io.to(getUserRoomName(session.callerId)).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        callId,
        receiver: session.receiverInfo,
      });

      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { callId, status: 'accepted' }));
      }
    } catch (err) {
      logger.error(`📞 Call accept error: ${err.message}`);
    }
  });

  // 3. Reject Incoming Call (Worker -> Farmer)
  socket.on(SOCKET_EVENTS.CALL_REJECT, (data, callback) => {
    try {
      const { callId, reason } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session || session.receiverId !== userId) {
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, null, 'Call session invalid or expired'));
        }
        return;
      }

      callSessionStore.endSession(callId, 'rejected');
      logger.info(`📞 Call rejected [${callId}] by receiver ${userId}`);

      // Notify caller
      io.to(getUserRoomName(session.callerId)).emit(SOCKET_EVENTS.CALL_REJECTED, {
        callId,
        reason: reason || 'Worker is unavailable / rejected the call',
      });

      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { callId, status: 'rejected' }));
      }
    } catch (err) {
      logger.error(`📞 Call reject error: ${err.message}`);
    }
  });

  // 4. Cancel Outgoing Call (Farmer cancels while ringing)
  socket.on(SOCKET_EVENTS.CALL_CANCEL, (data, callback) => {
    try {
      const { callId } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session || session.callerId !== userId) {
        if (typeof callback === 'function') {
          return callback(formatSocketResponse(false, null, 'Call session invalid or expired'));
        }
        return;
      }

      callSessionStore.endSession(callId, 'cancelled');
      logger.info(`📞 Call cancelled [${callId}] by caller ${userId}`);

      // Notify receiver
      io.to(getUserRoomName(session.receiverId)).emit(SOCKET_EVENTS.CALL_CANCELLED, {
        callId,
        reason: 'Caller cancelled the call',
      });

      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { callId, status: 'cancelled' }));
      }
    } catch (err) {
      logger.error(`📞 Call cancel error: ${err.message}`);
    }
  });

  // 5. WebRTC Offer Forwarding (Caller -> Receiver)
  socket.on(SOCKET_EVENTS.CALL_OFFER, (data) => {
    try {
      const { callId, offer } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session || session.callerId !== userId) {
        return;
      }

      io.to(getUserRoomName(session.receiverId)).emit(SOCKET_EVENTS.CALL_OFFER, {
        callId,
        offer,
        from: userId,
      });
    } catch (err) {
      logger.error(`📞 WebRTC offer forwarding error: ${err.message}`);
    }
  });

  // 6. WebRTC Answer Forwarding (Receiver -> Caller)
  socket.on(SOCKET_EVENTS.CALL_ANSWER, (data) => {
    try {
      const { callId, answer } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session || session.receiverId !== userId) {
        return;
      }

      callSessionStore.setConnected(callId);

      io.to(getUserRoomName(session.callerId)).emit(SOCKET_EVENTS.CALL_ANSWER, {
        callId,
        answer,
        from: userId,
      });
    } catch (err) {
      logger.error(`📞 WebRTC answer forwarding error: ${err.message}`);
    }
  });

  // 7. WebRTC ICE Candidate Forwarding (Both directions)
  socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, (data) => {
    try {
      const { callId, candidate } = data || {};
      const session = callSessionStore.getSession(callId);

      if (!session) return;

      const isCaller = session.callerId === userId;
      const isReceiver = session.receiverId === userId;

      if (!isCaller && !isReceiver) return;

      const targetUserId = isCaller ? session.receiverId : session.callerId;

      io.to(getUserRoomName(targetUserId)).emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
        callId,
        candidate,
        from: userId,
      });
    } catch (err) {
      logger.error(`📞 WebRTC ICE candidate error: ${err.message}`);
    }
  });

  // 8. End Call (Either participant terminates active call)
  socket.on(SOCKET_EVENTS.CALL_END, (data, callback) => {
    try {
      const { callId, reason } = data || {};
      const session = callId ? callSessionStore.getSession(callId) : callSessionStore.getUserActiveCall(userId);

      if (!session) {
        if (typeof callback === 'function') callback(formatSocketResponse(true, { message: 'No active call' }));
        return;
      }

      const otherUserId = session.callerId === userId ? session.receiverId : session.callerId;
      callSessionStore.endSession(session.callId, 'ended');

      logger.info(`📞 Call ended [${session.callId}] by user ${userId}`);

      // Notify the other peer
      io.to(getUserRoomName(otherUserId)).emit(SOCKET_EVENTS.CALL_END, {
        callId: session.callId,
        reason: reason || 'Call ended by remote user',
      });

      if (typeof callback === 'function') {
        callback(formatSocketResponse(true, { callId: session.callId, status: 'ended' }));
      }
    } catch (err) {
      logger.error(`📞 Call end error: ${err.message}`);
    }
  });
};
