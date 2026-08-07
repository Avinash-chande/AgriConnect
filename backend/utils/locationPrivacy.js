/**
 * Utility: Location Privacy Controls & Sanitization
 */

/**
 * Applies deterministic spatial jitter (~200m - 400m offset) to coordinates for approximate location mode
 */
export const applyCoordinateJitter = (lat, lng, seedStr = '') => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { latitude: lat, longitude: lng };
  }

  // Hash seed string to get deterministic offset
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const latOffset = ((Math.abs(hash) % 11) - 5) * 0.0018; // ~180m jitter
  const lngOffset = (((Math.abs(hash) * 7) % 11) - 5) * 0.0018;

  return {
    latitude: Number((lat + latOffset).toFixed(5)),
    longitude: Number((lng + lngOffset).toFixed(5)),
  };
};

/**
 * Filters location data based on locationVisibility preference ('private' | 'approximate' | 'verified_users' | 'public')
 */
export const applyLocationPrivacy = (item, viewerUser = null) => {
  if (!item) return item;

  const doc = item.toObject ? item.toObject() : { ...item };
  const visibility = doc.locationVisibility || 'approximate';

  const isOwner = viewerUser && doc.owner && viewerUser._id && viewerUser._id.toString() === doc.owner.toString();
  const isVerified = viewerUser && (viewerUser.isVerified || viewerUser.role === 'Farmer');

  // Owner always sees exact full location
  if (isOwner) {
    return doc;
  }

  // Handle 'private' visibility
  if (visibility === 'private') {
    if (doc.address) {
      doc.address = {
        village: doc.address.village || '',
        district: doc.address.district || '',
        state: doc.address.state || '',
        country: doc.address.country || 'India',
        latitude: null,
        longitude: null,
      };
    }
    if (doc.farmAddress) {
      doc.farmAddress = {
        village: doc.farmAddress.village || '',
        district: doc.farmAddress.district || '',
        state: doc.farmAddress.state || '',
        country: doc.farmAddress.country || 'India',
        latitude: null,
        longitude: null,
      };
    }
    if (doc.location) {
      doc.location = null;
    }
    return doc;
  }

  // Handle 'approximate' or unverified access
  if (visibility === 'approximate' || (visibility === 'verified_users' && !isVerified)) {
    const seed = doc._id ? doc._id.toString() : 'jitter';

    if (doc.address && doc.address.latitude && doc.address.longitude) {
      const jittered = applyCoordinateJitter(doc.address.latitude, doc.address.longitude, seed);
      doc.address.addressLine = '[Approximate Area]';
      doc.address.pincode = undefined;
      doc.address.latitude = jittered.latitude;
      doc.address.longitude = jittered.longitude;
    }

    if (doc.farmAddress && doc.farmAddress.latitude && doc.farmAddress.longitude) {
      const jittered = applyCoordinateJitter(doc.farmAddress.latitude, doc.farmAddress.longitude, seed);
      doc.farmAddress.addressLine = '[Approximate Farm Site]';
      doc.farmAddress.pincode = undefined;
      doc.farmAddress.latitude = jittered.latitude;
      doc.farmAddress.longitude = jittered.longitude;
    }

    if (doc.location && Array.isArray(doc.location.coordinates)) {
      const jittered = applyCoordinateJitter(doc.location.coordinates[1], doc.location.coordinates[0], seed);
      doc.location.coordinates = [jittered.longitude, jittered.latitude];
    }
  }

  return doc;
};
