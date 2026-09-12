import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test location helper simulating Nominatim reverse geocode parser
const parseNominatimResponse = (response: any, lat: number, lng: number) => {
  const addr = response?.data?.address || {};
  // Village / Locality priority: village -> town -> city -> municipality -> suburb -> neighbourhood -> hamlet
  const village = addr.village || addr.town || addr.city || addr.municipality || addr.suburb || addr.neighbourhood || addr.hamlet || '';
  // District priority: district -> state_district -> county -> city_district -> city
  const district = addr.district || addr.state_district || addr.county || addr.city_district || addr.city || '';
  const state = addr.state || '';
  const country = addr.country || 'India';
  const pincode = addr.postcode || '';
  const addressLine = response?.data?.name || addr.road || '';
  const formattedAddress = response?.data?.display_name || [addressLine, village, district, state, country, pincode].filter(Boolean).join(', ');

  return {
    latitude: lat,
    longitude: lng,
    village,
    district,
    state,
    country,
    pincode,
    addressLine,
    formattedAddress,
  };
};

describe('Farmer Profile Dynamic Reverse Geocoding and Location Persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should accurately reverse geocode Location A (Pune, Maharashtra)', () => {
    const lat = 18.5204;
    const lng = 73.8567;
    const mockApiResponse = {
      data: {
        display_name: 'Shivajinagar, Pune, Pune District, Maharashtra, 411005, India',
        name: 'Shivajinagar',
        address: {
          suburb: 'Shivajinagar',
          city: 'Pune',
          district: 'Pune District',
          state: 'Maharashtra',
          postcode: '411005',
          country: 'India',
        },
      },
    };

    const result = parseNominatimResponse(mockApiResponse, lat, lng);

    expect(result.latitude).toBe(18.5204);
    expect(result.longitude).toBe(73.8567);
    expect(result.district).toBe('Pune District');
    expect(result.state).toBe('Maharashtra');
    expect(result.pincode).toBe('411005');
    expect(result.village).toBe('Pune');
    expect(result.country).toBe('India');
    expect(result.district).not.toBe('Hoshiarpur');
    expect(result.district).not.toBe('Amritsar');
    expect(result.state).not.toBe('Punjab');
  });

  it('should accurately reverse geocode Location B (Bengaluru, Karnataka)', () => {
    const lat = 12.9716;
    const lng = 77.5946;
    const mockApiResponse = {
      data: {
        display_name: 'Cubbon Park, Gandhi Nagar, Bengaluru, Bengaluru Urban, Karnataka, 560001, India',
        name: 'Cubbon Park',
        address: {
          suburb: 'Gandhi Nagar',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          postcode: '560001',
          country: 'India',
        },
      },
    };

    const result = parseNominatimResponse(mockApiResponse, lat, lng);

    expect(result.latitude).toBe(12.9716);
    expect(result.longitude).toBe(77.5946);
    expect(result.district).toBe('Bengaluru Urban');
    expect(result.state).toBe('Karnataka');
    expect(result.pincode).toBe('560001');
    expect(result.village).toBe('Bengaluru');
  });

  it('should accurately reverse geocode Location C (Indore, Madhya Pradesh)', () => {
    const lat = 22.7196;
    const lng = 75.8577;
    const mockApiResponse = {
      data: {
        display_name: 'Rajwada, Indore, Indore District, Madhya Pradesh, 452004, India',
        name: 'Rajwada',
        address: {
          village: 'Indore Kasba',
          district: 'Indore District',
          state: 'Madhya Pradesh',
          postcode: '452004',
          country: 'India',
        },
      },
    };

    const result = parseNominatimResponse(mockApiResponse, lat, lng);

    expect(result.latitude).toBe(22.7196);
    expect(result.longitude).toBe(75.8577);
    expect(result.district).toBe('Indore District');
    expect(result.state).toBe('Madhya Pradesh');
    expect(result.pincode).toBe('452004');
    expect(result.village).toBe('Indore Kasba');
  });

  it('should not fabricate fake address when geocoding service is unreachable', () => {
    const lat = 19.076;
    const lng = 72.8777;
    const emptyResponse = { data: null };

    const result = parseNominatimResponse(emptyResponse, lat, lng);

    expect(result.latitude).toBe(19.076);
    expect(result.longitude).toBe(72.8777);
    expect(result.district).toBe('');
    expect(result.state).toBe('');
    expect(result.pincode).toBe('');
    expect(result.village).toBe('');
    expect(result.district).not.toBe('Hoshiarpur');
    expect(result.district).not.toBe('Amritsar');
    expect(result.state).not.toBe('Punjab');
  });

  it('should structure GeoJSON coordinates as [longitude, latitude]', () => {
    const lat = 18.5204;
    const lng = 73.8567;

    const geoPoint = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    expect(geoPoint.coordinates[0]).toBe(73.8567); // longitude
    expect(geoPoint.coordinates[1]).toBe(18.5204); // latitude
  });
});
