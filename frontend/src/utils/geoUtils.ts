/**
 * Known Indian City Coordinates & Keyword Rules for Auto-Healing
 */
export interface CityCoordinateRule {
  city: string;
  keywords: string[];
  coordinates: [number, number]; // [lng, lat]
}

export const KNOWN_CITY_COORDINATES: CityCoordinateRule[] = [
  {
    city: 'Bengaluru',
    keywords: [
      'chokkasandra',
      'peenya',
      'bengaluru',
      'bangalore',
      'karnataka',
      'koramangala',
      'indiranagar',
      'whitefield',
      'jayanagar',
      'electronic city',
      'yelahanka',
      'rajajinagar',
      'marathahalli',
      'hsr layout',
      '560057',
      '5600',
    ],
    coordinates: [77.5058, 13.04314], // [lng, lat] for Chokkasandra / Bengaluru
  },
  {
    city: 'Delhi NCR',
    keywords: [
      'connaught',
      'new delhi',
      'delhi',
      'karol bagh',
      'sector 12',
      'dwarka',
      'rohini',
      'saket',
      'noida',
      'gurgaon',
      'gurugram',
      'faridabad',
      'ghaziabad',
      '110001',
      '1100',
    ],
    coordinates: [77.2150, 28.6250],
  },
  {
    city: 'Mumbai',
    keywords: [
      'mumbai',
      'bombay',
      'andheri',
      'bandra',
      'dadar',
      'thane',
      'navi mumbai',
      'borivali',
      '4000',
    ],
    coordinates: [72.8777, 19.0760],
  },
  {
    city: 'Hyderabad',
    keywords: [
      'hyderabad',
      'secunderabad',
      'cyberabad',
      'gachibowli',
      'madhapur',
      'hitech city',
      '5000',
    ],
    coordinates: [78.4867, 17.3850],
  },
  {
    city: 'Pune',
    keywords: ['pune', 'kothrud', 'wakad', 'hinjewadi', 'vimannagar', 'shivajinagar', '4110'],
    coordinates: [73.8567, 18.5204],
  },
  {
    city: 'Chennai',
    keywords: ['chennai', 'madras', 'guindy', 'adyar', 'velachery', 'anna nagar', '6000'],
    coordinates: [80.2707, 13.0827],
  },
  {
    city: 'Kolkata',
    keywords: ['kolkata', 'calcutta', 'howrah', 'salt lake', 'new town', '7000'],
    coordinates: [88.3639, 22.5726],
  },
];

/**
 * Calculate distance in km between two coordinates [lat, lng]
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Reconcile / Auto-Heal Coordinates:
 * If an address text clearly references a city (e.g. "Chokkasandra, Bengaluru"),
 * but current coords are in a different city (e.g. Delhi, distance > 50 km),
 * auto-correct the coordinates to that city's coordinates.
 */
export const reconcileCityCoordinates = (
  address?: string,
  currentCoords?: [number, number]
): [number, number] => {
  const defaultDelhi: [number, number] = [77.2150, 28.6250];
  if (!address || !address.trim()) {
    return currentCoords || defaultDelhi;
  }

  const normalized = address.toLowerCase();

  for (const rule of KNOWN_CITY_COORDINATES) {
    const hasKeyword = rule.keywords.some((kw) => normalized.includes(kw));
    if (hasKeyword) {
      if (!currentCoords) {
        return rule.coordinates;
      }
      // Check distance between current coordinates and the detected city
      const [targetLng, targetLat] = rule.coordinates;
      const [currLng, currLat] = currentCoords;
      const dist = calculateDistanceKm(currLat, currLng, targetLat, targetLng);

      // If current coords are more than 50 km away from the detected city,
      // it's a desynchronization mismatch (e.g. user typed Bengaluru while pin was in Delhi)
      if (dist > 50) {
        console.log(`📍 [GeoUtils] Auto-healing coordinates for "${address}": [${currLng}, ${currLat}] -> [${targetLng}, ${targetLat}] (distance was ${dist} km)`);
        return rule.coordinates;
      }

      // If within 50 km, preserve precise user pin
      return currentCoords;
    }
  }

  return currentCoords || defaultDelhi;
};
