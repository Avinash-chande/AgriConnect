import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNearbyJobsApi, type NearbyJobItem } from '../services/jobService';
import { getNearbyWorkersApi, calculateRouteApi, geocodeAddressApi, type NearbyWorkerItem } from '../services/locationService';

export interface NearbyJobsQueryParams {
  latitude: number;
  longitude: number;
  radius?: number;
  category?: string;
  minWage?: number;
  minExperience?: number;
  workType?: string;
  isUrgent?: boolean;
  isFeatured?: boolean;
  startDate?: string;
  sort?: 'distance' | 'newest' | 'wage';
  page?: number;
  limit?: number;
}

export interface NearbyWorkersQueryParams {
  latitude: number;
  longitude: number;
  radius?: number;
  skills?: string;
  minExperience?: number;
  availability?: string;
  maxWage?: number;
  minRating?: number;
  sort?: 'distance' | 'rating' | 'experience' | 'wage';
  page?: number;
  limit?: number;
}

/**
 * React Query Hook: Nearby Jobs Discovery with 5-min staleTime client caching
 */
export function useNearbyJobsQuery(params: NearbyJobsQueryParams, enabled = true) {
  return useQuery({
    queryKey: [
      'nearbyJobs',
      params.latitude,
      params.longitude,
      params.radius || 10,
      params.category || 'all',
      params.minWage || 0,
      params.workType || 'all',
      params.isUrgent || false,
      params.sort || 'distance',
      params.page || 1,
    ],
    queryFn: async () => {
      const response = await getNearbyJobsApi(params);
      return response;
    },
    enabled: enabled && !!params.latitude && !!params.longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * React Query Hook: Nearby Workers Discovery with 5-min staleTime client caching
 */
export function useNearbyWorkersQuery(params: NearbyWorkersQueryParams, enabled = true) {
  return useQuery({
    queryKey: [
      'nearbyWorkers',
      params.latitude,
      params.longitude,
      params.radius || 10,
      params.skills || 'all',
      params.minExperience || 0,
      params.availability || 'all',
      params.maxWage || 2000,
      params.sort || 'distance',
      params.page || 1,
    ],
    queryFn: async () => {
      const response = await getNearbyWorkersApi(params);
      return response;
    },
    enabled: enabled && !!params.latitude && !!params.longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * React Query Hook: Address Geocoding with 60-min client caching
 */
export function useGeocodeQuery(searchQuery: string, enabled = true) {
  return useQuery({
    queryKey: ['geocode', searchQuery.trim().toLowerCase()],
    queryFn: async () => {
      const data = await geocodeAddressApi(searchQuery);
      return data;
    },
    enabled: enabled && searchQuery.trim().length >= 3,
    staleTime: 60 * 60 * 1000, // 1 hour stale time
    gcTime: 120 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * React Query Hook: Driving Route Calculation with 60-min client caching
 */
export function useRouteQuery(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['routeNavigation', startLat, startLng, endLat, endLng],
    queryFn: async () => {
      const response = await calculateRouteApi(startLat, startLng, endLat, endLng);
      return response;
    },
    enabled: enabled && !!startLat && !!startLng && !!endLat && !!endLng,
    staleTime: 60 * 60 * 1000, // 1 hour stale time
    gcTime: 120 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
