/**
 * Phase 8 – useCurrentLocation Hook Tests
 * Tests: GPS permission denied, GPS success, GPS timeout, unsupported,
 *        POSITION_UNAVAILABLE, clearLocation(), accuracyThreshold low-accuracy flag.
 * External providers: navigator.geolocation API is fully mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';

// ── Mock navigator.geolocation before each test ───────────────────────────
const originalGeo = navigator.geolocation;

describe('Phase 8 – useCurrentLocation Hook Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'geolocation', { value: originalGeo, writable: true });
  });

  // Helpers
  const mockGeoSuccess = (lat = 31.634, lng = 75.8573, accuracy = 25) => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn().mockImplementation((success) =>
          success({ coords: { latitude: lat, longitude: lng, accuracy }, timestamp: Date.now() })
        ),
        clearWatch: vi.fn(),
      },
      writable: true,
    });
  };

  const mockGeoError = (code: number, message = 'Error') => {
    const err = { code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message };
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn().mockImplementation((_, error) => error(err)),
        clearWatch: vi.fn(),
      },
      writable: true,
    });
  };

  // ── GPS Success ─────────────────────────────────────────────────
  it('1. returns coordinates on GPS success', async () => {
    mockGeoSuccess(31.634, 75.8573, 25);
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });

    expect(result.current.coordinates).toEqual({ latitude: 31.634, longitude: 75.8573 });
    expect(result.current.accuracy).toBe(25);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.permissionState).toBe('granted');
  });

  // ── GPS Permission Denied ───────────────────────────────────────
  it('2. sets PERMISSION_DENIED error code when user denies', async () => {
    mockGeoError(1);
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });

    expect(result.current.coordinates).toBeNull();
    expect(result.current.errorCode).toBe('PERMISSION_DENIED');
    expect(result.current.error).toContain('denied');
    expect(result.current.permissionState).toBe('denied');
    expect(result.current.loading).toBe(false);
  });

  // ── GPS Timeout ────────────────────────────────────────────────
  it('3. sets TIMEOUT error code on GPS timeout', async () => {
    mockGeoError(3, 'Timeout occurred');
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });

    expect(result.current.errorCode).toBe('TIMEOUT');
    expect(result.current.error).toContain('timed out');
    expect(result.current.coordinates).toBeNull();
  });

  // ── GPS POSITION_UNAVAILABLE ───────────────────────────────────
  it('4. sets POSITION_UNAVAILABLE error code', async () => {
    mockGeoError(2, 'Position unavailable');
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });

    expect(result.current.errorCode).toBe('POSITION_UNAVAILABLE');
    expect(result.current.error).toContain('unavailable');
  });

  // ── Unsupported Browser ────────────────────────────────────────
  it('5. sets UNSUPPORTED when geolocation API is absent', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, writable: true });
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    let res: any;
    await act(async () => { res = await result.current.refetchLocation(); });

    expect(res).toBeNull();
    expect(result.current.errorCode).toBe('UNSUPPORTED');
    expect(result.current.error).toContain('not supported');
  });

  // ── Low Accuracy Threshold ─────────────────────────────────────
  it('6. flags isLowAccuracy when accuracy exceeds threshold', async () => {
    mockGeoSuccess(31.634, 75.8573, 2000); // 2000m accuracy > default 1000m threshold
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false, accuracyThreshold: 500 }));

    await act(async () => { await result.current.refetchLocation(); });

    expect(result.current.isLowAccuracy).toBe(true);
  });

  // ── clearLocation ──────────────────────────────────────────────
  it('7. clearLocation() resets all state to null/initial values', async () => {
    mockGeoSuccess();
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });
    expect(result.current.coordinates).not.toBeNull();

    act(() => { result.current.clearLocation(); });

    expect(result.current.coordinates).toBeNull();
    expect(result.current.accuracy).toBeNull();
    expect(result.current.timestamp).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // ── Coordinate precision ───────────────────────────────────────
  it('8. returns coordinates rounded to 6 decimal places', async () => {
    mockGeoSuccess(31.63412345678, 75.85731234567, 15);
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    await act(async () => { await result.current.refetchLocation(); });

    const lat = result.current.coordinates!.latitude.toString();
    const lng = result.current.coordinates!.longitude.toString();
    const latDecimals = lat.split('.')[1]?.length ?? 0;
    const lngDecimals = lng.split('.')[1]?.length ?? 0;
    expect(latDecimals).toBeLessThanOrEqual(6);
    expect(lngDecimals).toBeLessThanOrEqual(6);
  });

  // ── refetchLocation returns result ─────────────────────────────
  it('9. refetchLocation() resolves with LocationResult on success', async () => {
    mockGeoSuccess(31.634, 75.8573, 30);
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    let locationResult: any;
    await act(async () => { locationResult = await result.current.refetchLocation(); });

    expect(locationResult).not.toBeNull();
    expect(locationResult.coordinates).toEqual({ latitude: 31.634, longitude: 75.8573 });
    expect(locationResult.accuracy).toBe(30);
  });

  // ── refetchLocation returns null on error ──────────────────────
  it('10. refetchLocation() resolves with null on permission denied', async () => {
    mockGeoError(1);
    const { result } = renderHook(() => useCurrentLocation({ autoFetch: false }));

    let locationResult: any;
    await act(async () => { locationResult = await result.current.refetchLocation(); });

    expect(locationResult).toBeNull();
  });
});
