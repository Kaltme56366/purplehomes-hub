/**
 * Distance Calculator - Calculates geographic distance between two points
 * Uses Haversine formula for accurate distance calculation
 */

/**
 * Calculates the great-circle distance between two points on Earth
 * Uses the Haversine formula
 *
 * @param lat1 - Latitude of first point (in decimal degrees)
 * @param lng1 - Longitude of first point (in decimal degrees)
 * @param lat2 - Latitude of second point (in decimal degrees)
 * @param lng2 - Longitude of second point (in decimal degrees)
 * @returns Distance in miles
 *
 * @example
 * const distance = calculateDistance(33.4484, -112.0740, 33.5207, -112.2700);
 * // Returns: ~14.2 (miles from Phoenix to Glendale, AZ)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Converts degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Checks if a point is within a certain radius of another point
 * @param lat1 - Latitude of center point
 * @param lng1 - Longitude of center point
 * @param lat2 - Latitude of point to check
 * @param lng2 - Longitude of point to check
 * @param radiusMiles - Radius in miles
 * @returns True if point is within radius
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusMiles;
}

/**
 * Finds the closest point from a list of points
 * @param originLat - Latitude of origin
 * @param originLng - Longitude of origin
 * @param points - Array of points with lat/lng
 * @returns Index of closest point, or -1 if no points
 */
export function findClosestPoint(
  originLat: number,
  originLng: number,
  points: Array<{ lat: number; lng: number }>
): number {
  if (points.length === 0) return -1;

  let minDistance = Infinity;
  let closestIndex = 0;

  points.forEach((point, index) => {
    const distance = calculateDistance(originLat, originLng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}
