import '@testing-library/jest-dom';


// Suppress console.warn/error during tests unless needed
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ReactDOM.render') ||
        args[0].includes('act(') ||
        args[0].includes('React Router Future Flag'))
    ) {
      return;
    }
    originalWarn(...args);
  };
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented') ||
        args[0].includes('ReactDOM.render'))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IntersectionObserver used by Leaflet / maps
global.IntersectionObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
} as any;

// Mock WebRTC APIs for jsdom
class MockRTCPeerConnection {
  iceConnectionState = 'new';
  connectionState = 'connected';
  onicecandidate: any = null;
  ontrack: any = null;
  onconnectionstatechange: any = null;
  remoteDescription: any = null;
  localDescription: any = null;

  addTrack = vi.fn();
  removeTrack = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-offer-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' });
  setLocalDescription = vi.fn().mockImplementation((desc) => {
    this.localDescription = desc;
    return Promise.resolve();
  });
  setRemoteDescription = vi.fn().mockImplementation((desc) => {
    this.remoteDescription = desc;
    return Promise.resolve();
  });
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

class MockRTCSessionDescription {
  type: string;
  sdp: string;
  constructor(init?: any) {
    this.type = init?.type || '';
    this.sdp = init?.sdp || '';
  }
}

class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  constructor(init?: any) {
    this.candidate = init?.candidate || '';
    this.sdpMid = init?.sdpMid || null;
    this.sdpMLineIndex = init?.sdpMLineIndex || null;
  }
}

(global as any).RTCPeerConnection = MockRTCPeerConnection;
(global as any).RTCSessionDescription = MockRTCSessionDescription;
(global as any).RTCIceCandidate = MockRTCIceCandidate;

if (typeof window !== 'undefined') {
  (window as any).RTCPeerConnection = MockRTCPeerConnection;
  (window as any).RTCSessionDescription = MockRTCSessionDescription;
  (window as any).RTCIceCandidate = MockRTCIceCandidate;
}
