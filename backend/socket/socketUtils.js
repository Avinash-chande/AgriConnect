/**
 * Socket Room & Payload Utility Helpers
 */

export const getUserRoomName = (userId) => {
  return `user:${userId.toString()}`;
};

export const getJobRoomName = (jobId) => {
  return `job:${jobId.toString()}`;
};

export const formatSocketResponse = (success, data = null, error = null) => {
  return {
    success,
    data,
    error: error ? (typeof error === 'string' ? error : error.message || 'Socket operation error') : null,
    timestamp: new Date().toISOString(),
  };
};

export const safeSocketEmit = (socket, event, data) => {
  try {
    socket.emit(event, data);
  } catch (err) {
    console.error(`Error emitting socket event ${event}:`, err);
  }
};
