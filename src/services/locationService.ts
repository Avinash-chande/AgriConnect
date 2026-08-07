import { api } from './api';

export interface NearbyWorkerItem {
  worker: {
    _id: string;
    ownerId: string;
    name: string;
    profileImage?: string;
    isVerified?: boolean;
    title?: string;
    bio?: string;
    skills: string[];
    experience: number;
    languages: string[];
    education?: string;
    expectedDailyWage: number;
    expectedMonthlySalary?: number;
    availability: string;
    preferredWorkType?: string;
    preferredDistrict?: string;
    preferredState?: string;
    rating: number;
    totalJobsCompleted: number;
    address?: {
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
    } | null;
  };
  distanceKm: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const getNearbyWorkersApi = async (params: {
  latitude: number;
  longitude: number;
  radius?: number;
  skills?: string;
  minExperience?: number;
  availability?: string;
  maxWage?: number;
  language?: string;
  district?: string;
  minRating?: number;
  sort?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get('/location/nearby-workers', { params });
  return response.data;
};

export const geocodeAddressApi = async (query: string) => {
  const response = await api.get('/location/geocode', { params: { q: query } });
  return response.data;
};

export const reverseGeocodeApi = async (lat: number, lng: number) => {
  const response = await api.get('/location/reverse', { params: { lat, lng } });
  return response.data;
};

export const calculateRouteApi = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
  const response = await api.get('/location/route', {
    params: { startLat, startLng, endLat, endLng },
  });
  return response.data;
};
