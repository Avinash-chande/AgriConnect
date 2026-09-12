import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

describe('useCurrentLocation Hook Suite', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
    });
  });

  it('1. should handle unsupported geolocation API gracefully', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    let res;
    await act(async () => {
      res = await result.current.refetchLocation();
    });

    expect(res).toBeNull();
    expect(result.current.errorCode).toBe('UNSUPPORTED');
    expect(result.current.error).toContain('not supported');
  });

  it('2. should fetch coordinates and accuracy successfully when permission is granted', async () => {
    const mockPosition = {
      coords: {
        latitude: 31.634,
        longitude: 75.8573,
        accuracy: 25,
      },
      timestamp: 1700000000000,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((success) => {
      success(mockPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      writable: true,
    });

    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => {
      await result.current.refetchLocation();
    });

    expect(result.current.coordinates).toEqual({ latitude: 31.634, longitude: 75.8573 });
    expect(result.current.accuracy).toBe(25);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('3. should handle PERMISSION_DENIED error code correctly', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
      message: 'User denied Geolocation',
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((_, error) => {
      error(mockError);
    });

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      writable: true,
    });

    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => {
      await result.current.refetchLocation();
    });

    expect(result.current.coordinates).toBeNull();
    expect(result.current.errorCode).toBe('PERMISSION_DENIED');
    expect(result.current.error).toContain('denied');
  });

  it('4. should clear location state when clearLocation() is invoked', async () => {
    const mockPosition = {
      coords: { latitude: 30.9, longitude: 75.8, accuracy: 10 },
      timestamp: 1700000000000,
    };

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: (cb: any) => cb(mockPosition) },
      writable: true,
    });

    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => {
      await result.current.refetchLocation();
    });

    expect(result.current.coordinates).not.toBeNull();

    act(() => {
      result.current.clearLocation();
    });

    expect(result.current.coordinates).toBeNull();
    expect(result.current.accuracy).toBeNull();
    expect(result.current.timestamp).toBeNull();
  });
});
