/**
 * @file backend/tests/socket.test.js
 * @description Real-time Socket.IO Connection, Room Join, Typing, and Read Receipts Test Suite
 */

import { jest } from '@jest/globals';
import { registerSocketHandlers } from '../socket/socketHandler.js';
import { SOCKET_EVENTS } from '../socket/socketEvents.js';

describe('Socket.IO Real-Time Engine Tests', () => {
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-123',
      user: { id: 'user-789', name: 'Farmer Ramesh', role: 'Farmer' },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };

    mockIo = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    };
  });

  it('should disconnect unauthenticated socket connections', () => {
    const unauthSocket = { id: 'unauth-1', user: null, disconnect: jest.fn() };
    registerSocketHandlers(mockIo, unauthSocket);
    expect(unauthSocket.disconnect).toHaveBeenCalledWith(true);
  });

  it('should join user personal room and emit AUTHENTICATED event on connection', () => {
    registerSocketHandlers(mockIo, mockSocket);

    expect(mockSocket.join).toHaveBeenCalledWith('user:user-789');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.AUTHENTICATED,
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('should register event listeners for typing, joining job rooms, and disconnects', () => {
    registerSocketHandlers(mockIo, mockSocket);

    const registeredEvents = mockSocket.on.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain(SOCKET_EVENTS.JOIN_JOB_ROOM);
    expect(registeredEvents).toContain(SOCKET_EVENTS.LEAVE_JOB_ROOM);
    expect(registeredEvents).toContain(SOCKET_EVENTS.CHAT_TYPING);
    expect(registeredEvents).toContain(SOCKET_EVENTS.CHAT_STOP_TYPING);
    expect(registeredEvents).toContain(SOCKET_EVENTS.DISCONNECT);
  });
});
