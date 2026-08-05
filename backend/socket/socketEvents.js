/**
 * AgriConnect Socket.IO Event Constants
 */

export const SOCKET_EVENTS = {
  // Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  ERROR: 'error',

  // Room Management
  JOIN_USER_ROOM: 'room:join_user',
  LEAVE_USER_ROOM: 'room:leave_user',
  JOIN_JOB_ROOM: 'room:join_job',
  LEAVE_JOB_ROOM: 'room:leave_job',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_COUNT_UPDATE: 'notification:count_update',

  // Applications
  APPLICATION_STATUS_UPDATED: 'application:status_updated',
  APPLICATION_NEW: 'application:new',
  APPLICATION_WITHDRAWN: 'application:withdrawn',

  // Job Alerts
  JOB_CREATED: 'job:created',
  JOB_STATUS_CHANGED: 'job:status_changed',

  // User Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  GET_ONLINE_USERS: 'user:get_online',

  // Chat Events
  CHAT_MESSAGE_SEND: 'chat:message_send',
  CHAT_MESSAGE_SENT: 'chat:message_sent',
  CHAT_MESSAGE_RECEIVED: 'chat:message_received',
  CHAT_MESSAGE_DELIVERED: 'chat:message_delivered',
  CHAT_MESSAGE_SEEN: 'chat:message_seen',
  CHAT_MESSAGE_EDITED: 'chat:message_edited',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_READ_RECEIPT: 'chat:read_receipt',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',
};
