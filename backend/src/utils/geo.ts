export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

const toRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

export const estimateEtaMinutes = (
  distanceKm: number,
  avgSpeedKmH: number = 20
): number => {
  if (distanceKm <= 0.1) return 1;
  const hours = distanceKm / avgSpeedKmH;
  return Math.ceil(hours * 60) + 3;
};

/**
 * Standard Base32 alphabet for Geohash (Gustavo Niemeyer specification)
 */
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Validates geographical coordinates (Latitude between -90 and 90, Longitude between -180 and 180).
 */
export const validateCoordinates = (
  rawLat: any,
  rawLng: any
): { isValid: boolean; lat?: number; lng?: number; error?: string } => {
  if (rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
    return { isValid: false, error: 'Both latitude and longitude are required.' };
  }

  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat).trim());
  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng).trim());

  if (isNaN(lat) || !isFinite(lat)) {
    return { isValid: false, error: 'Latitude must be a valid finite number.' };
  }

  if (isNaN(lng) || !isFinite(lng)) {
    return { isValid: false, error: 'Longitude must be a valid finite number.' };
  }

  if (lat < -90 || lat > 90) {
    return {
      isValid: false,
      error: `Latitude (${lat}) is out of range. Must be between -90 and 90 degrees.`,
    };
  }

  if (lng < -180 || lng > 180) {
    return {
      isValid: false,
      error: `Longitude (${lng}) is out of range. Must be between -180 and 180 degrees.`,
    };
  }

  return { isValid: true, lat, lng };
};

/**
 * Encodes latitude and longitude into a standard Geohash string.
 * Precision 6 divides the world into approx 1.2 km x 0.6 km geographical bounding boxes.
 */
export const encodeGeohash = (
  latitude: number,
  longitude: number,
  precision: number = 6
): string => {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.isValid || validation.lat === undefined || validation.lng === undefined) {
    throw new Error(validation.error || 'Invalid coordinates for geohash encoding');
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lonMin = -180.0;
  let lonMax = 180.0;

  let geohash = '';
  let isLon = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isLon) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isLon = !isLon;

    if (bit < 4) {
      bit++;
    } else {
      geohash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
};
