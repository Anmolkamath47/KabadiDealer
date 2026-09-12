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
