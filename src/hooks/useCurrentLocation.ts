import { useState, useEffect, useCallback, useRef } from 'react';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface LocationResult {
  coordinates: LocationCoordinates | null;
  accuracy: number | null;
  timestamp: number | null;
}

export interface UseCurrentLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoFetch?: boolean;
  watch?: boolean;
  accuracyThreshold?: number; // Maximum acceptable accuracy radius in meters (e.g., 500m)
}

export interface UseCurrentLocationReturn extends LocationResult {
  loading: boolean;
  error: string | null;
  errorCode: LocationErrorCode | null;
  isLowAccuracy: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  refetchLocation: (
    overrideOptions?: Partial<UseCurrentLocationOptions>
  ) => Promise<LocationResult | null>;
  clearLocation: () => void;
}

/**
 * Production-Ready React Hook for Browser Geolocation API
 * Privacy-First: Does not continuously track or store coordinates automatically without explicit user consent.
 */
export const useCurrentLocation = (
  options: UseCurrentLocationOptions = {}
): UseCurrentLocationReturn => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 30000,
    autoFetch = false,
    watch = false,
    accuracyThreshold = 1000,
  } = options;

  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<LocationErrorCode | null>(null);
  const [isLowAccuracy, setIsLowAccuracy] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Monitor Permissions API if available in browser
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (!isMountedRef.current) return;
          setPermissionState(status.state as any);
          status.onchange = () => {
            if (isMountedRef.current) {
              setPermissionState(status.state as any);
            }
          };
        })
        .catch(() => {
          if (isMountedRef.current) {
            setPermissionState('unknown');
          }
        });
    }
  }, []);

  /**
   * Clear active location state from memory
   */
  const clearLocation = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCoordinates(null);
    setAccuracy(null);
    setTimestamp(null);
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setIsLowAccuracy(false);
  }, []);

  /**
   * Refetch or manually request user's current GPS location
   */
  const refetchLocation = useCallback(
    async (
      overrideOptions?: Partial<UseCurrentLocationOptions>
    ): Promise<LocationResult | null> => {
      if (!navigator.geolocation) {
        const errMsg = 'Geolocation API is not supported by your browser.';
        setError(errMsg);
        setErrorCode('UNSUPPORTED');
        setLoading(false);
        return null;
      }

      setLoading(true);
      setError(null);
      setErrorCode(null);

      const geoOptions: PositionOptions = {
        enableHighAccuracy: overrideOptions?.enableHighAccuracy ?? enableHighAccuracy,
        timeout: overrideOptions?.timeout ?? timeout,
        maximumAge: overrideOptions?.maximumAge ?? maximumAge,
      };

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMountedRef.current) return;

            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            const acc = Math.round(pos.coords.accuracy);
            const ts = pos.timestamp;

            const coords: LocationCoordinates = { latitude: lat, longitude: lng };
            const lowAcc = acc > (overrideOptions?.accuracyThreshold ?? accuracyThreshold);

            setCoordinates(coords);
            setAccuracy(acc);
            setTimestamp(ts);
            setIsLowAccuracy(lowAcc);
            setPermissionState('granted');
            setLoading(false);

            resolve({
              coordinates: coords,
              accuracy: acc,
              timestamp: ts,
            });
          },
          (err) => {
            if (!isMountedRef.current) return;

            let code: LocationErrorCode = 'UNKNOWN';
            let message = 'An unknown error occurred while retrieving location.';

            switch (err.code) {
              case err.PERMISSION_DENIED:
                code = 'PERMISSION_DENIED';
                message =
                  'Location permission was denied. Please enable location access in browser settings to locate nearby jobs.';
                setPermissionState('denied');
                break;
              case err.POSITION_UNAVAILABLE:
                code = 'POSITION_UNAVAILABLE';
                message =
                  'GPS location position is unavailable. Please check that location services are enabled on your device.';
                break;
              case err.TIMEOUT:
                code = 'TIMEOUT';
                message =
                  'Location request timed out. Please check your signal and click retry.';
                break;
            }

            setError(message);
            setErrorCode(code);
            setLoading(false);

            resolve(null);
          },
          geoOptions
        );
      });
    },
    [enableHighAccuracy, timeout, maximumAge, accuracyThreshold]
  );

  // Handle autoFetch or continuous watching if explicitly requested
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation API is not supported by your browser.');
      setErrorCode('UNSUPPORTED');
      setLoading(false);
      return;
    }

    if (watch) {
      setLoading(true);
      const geoOptions: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMountedRef.current) return;
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = Math.round(pos.coords.accuracy);

          setCoordinates({ latitude: lat, longitude: lng });
          setAccuracy(acc);
          setTimestamp(pos.timestamp);
          setIsLowAccuracy(acc > accuracyThreshold);
          setPermissionState('granted');
          setLoading(false);
        },
        (err) => {
          if (!isMountedRef.current) return;
          let code: LocationErrorCode = 'UNKNOWN';
          let message = 'Error watching location.';
          if (err.code === err.PERMISSION_DENIED) {
            code = 'PERMISSION_DENIED';
            message = 'Location permission was denied.';
            setPermissionState('denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            code = 'POSITION_UNAVAILABLE';
            message = 'Position unavailable.';
          } else if (err.code === err.TIMEOUT) {
            code = 'TIMEOUT';
            message = 'Location request timed out.';
          }
          setError(message);
          setErrorCode(code);
          setLoading(false);
        },
        geoOptions
      );

      return () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } else if (autoFetch) {
      refetchLocation();
    }
  }, [autoFetch, watch, enableHighAccuracy, timeout, maximumAge, accuracyThreshold, refetchLocation]);

  return {
    coordinates,
    accuracy,
    timestamp,
    loading,
    error,
    errorCode,
    isLowAccuracy,
    permissionState,
    refetchLocation,
    clearLocation,
  };
};
