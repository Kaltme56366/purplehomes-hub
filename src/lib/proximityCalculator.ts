/**
 * Proximity Calculator
 *
 * Calculates distances between ZIP codes and provides proximity-based sorting
 * for property discovery (Zillow-style)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProximityTier {
  name: string;
  maxDistance: number;
  icon: string;
  color: string;
  description: string;
}

export const PROXIMITY_TIERS: Record<string, ProximityTier> = {
  exact: {
    name: 'Your Search Area',
    maxDistance: 0,
    icon: '📍',
    color: 'purple',
    description: 'In your desired location'
  },
  nearby: {
    name: 'Nearby Properties',
    maxDistance: 10,
    icon: '🎯',
    color: 'green',
    description: 'Within 10 miles'
  },
  close: {
    name: 'Close Properties',
    maxDistance: 25,
    icon: '📌',
    color: 'blue',
    description: 'Within 25 miles'
  },
  moderate: {
    name: 'Moderate Distance',
    maxDistance: 50,
    icon: '📍',
    color: 'orange',
    description: 'Within 50 miles'
  },
  far: {
    name: 'Extended Area',
    maxDistance: 100,
    icon: '🚗',
    color: 'gray',
    description: 'Within 100 miles'
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in miles
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3959; // Earth's radius in miles

  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get proximity tier based on distance
 * @param distance Distance in miles
 * @returns Proximity tier key
 */
export function getProximityTier(distance: number): string {
  if (distance === 0) return 'exact';
  if (distance <= 10) return 'nearby';
  if (distance <= 25) return 'close';
  if (distance <= 50) return 'moderate';
  return 'far';
}

/**
 * Get proximity tier object
 * @param distance Distance in miles
 * @returns ProximityTier object
 */
export function getProximityTierInfo(distance: number): ProximityTier {
  const tierKey = getProximityTier(distance);
  return PROXIMITY_TIERS[tierKey];
}

/**
 * Estimate commute time based on distance
 * Assumes average speed of 40 mph
 * @param distance Distance in miles
 * @returns Estimated time in minutes
 */
export function estimateCommute(distance: number): number {
  const averageSpeed = 40; // mph
  return Math.round((distance / averageSpeed) * 60);
}

/**
 * Format distance for display
 * @param distance Distance in miles
 * @returns Formatted string
 */
export function formatDistance(distance: number): string {
  if (distance === 0) return 'Same area';
  if (distance < 1) return `${(distance * 5280).toFixed(0)} ft`;
  return `${distance.toFixed(1)} mi`;
}

/**
 * Sample ZIP code coordinates database
 * In production, this would come from a real geolocation API or database
 */
export const ZIP_COORDINATES: Record<string, Coordinates> = {
  // Major US Cities - Sample data
  '10001': { latitude: 40.7506, longitude: -73.9971 }, // New York, NY
  '90001': { latitude: 33.9731, longitude: -118.2479 }, // Los Angeles, CA
  '60601': { latitude: 41.8858, longitude: -87.6234 }, // Chicago, IL
  '77001': { latitude: 29.7604, longitude: -95.3698 }, // Houston, TX
  '85001': { latitude: 33.4484, longitude: -112.0740 }, // Phoenix, AZ
  '19019': { latitude: 39.9526, longitude: -75.1652 }, // Philadelphia, PA
  '78201': { latitude: 29.4241, longitude: -98.4936 }, // San Antonio, TX
  '92101': { latitude: 32.7157, longitude: -117.1611 }, // San Diego, CA
  '75201': { latitude: 32.7767, longitude: -96.7970 }, // Dallas, TX
  '95101': { latitude: 37.3382, longitude: -121.8863 }, // San Jose, CA

  // Add more ZIP codes as needed
  // For production, use a comprehensive ZIP code database or geocoding API
};

/**
 * Get coordinates for a ZIP code
 * @param zip ZIP code
 * @returns Coordinates or null if not found
 */
export function getZIPCoordinates(zip: string): Coordinates | null {
  // Remove non-numeric characters
  const cleanZip = zip.replace(/\D/g, '').substring(0, 5);
  return ZIP_COORDINATES[cleanZip] || null;
}

/**
 * Calculate distance between two ZIP codes
 * @param zip1 First ZIP code
 * @param zip2 Second ZIP code
 * @returns Distance in miles, or null if coordinates not found
 */
export function calculateZIPDistance(zip1: string, zip2: string): number | null {
  const coord1 = getZIPCoordinates(zip1);
  const coord2 = getZIPCoordinates(zip2);

  if (!coord1 || !coord2) return null;

  return calculateDistance(coord1, coord2);
}

/**
 * Relevance scoring for properties
 * Higher score = more relevant to buyer
 */
export interface PropertyRelevance {
  budgetMatch: number;      // 0-100
  bedroomMatch: number;     // 0-100
  bathroomMatch: number;    // 0-100
  locationMatch: number;    // 0-100 (based on proximity)
  typeMatch: number;        // 0-100
  totalScore: number;       // Weighted average
}

export interface PropertyWithDistance {
  id: string;
  distance: number;
  tier: string;
  relevance: PropertyRelevance;
}

/**
 * Calculate relevance score for a property
 * @param property Property data
 * @param buyerPreferences Buyer preferences
 * @returns Relevance scores
 */
export function calculateRelevance(
  property: any,
  buyerPreferences: any
): PropertyRelevance {
  // Budget match (40% weight)
  const budgetDiff = Math.abs(property.price - buyerPreferences.budget);
  const budgetMatch = Math.max(0, 100 - (budgetDiff / buyerPreferences.budget) * 100);

  // Bedroom match (20% weight)
  const bedroomDiff = Math.abs(property.beds - buyerPreferences.bedrooms);
  const bedroomMatch = Math.max(0, 100 - bedroomDiff * 25);

  // Bathroom match (15% weight)
  const bathroomDiff = Math.abs(property.baths - buyerPreferences.bathrooms);
  const bathroomMatch = Math.max(0, 100 - bathroomDiff * 20);

  // Location match (15% weight) - based on proximity
  const distance = property.distance || 0;
  const locationMatch = Math.max(0, 100 - (distance / 50) * 100);

  // Type match (10% weight)
  const typeMatch = property.propertyType === buyerPreferences.propertyType ? 100 : 50;

  // Calculate weighted total
  const totalScore =
    budgetMatch * 0.40 +
    bedroomMatch * 0.20 +
    bathroomMatch * 0.15 +
    locationMatch * 0.15 +
    typeMatch * 0.10;

  return {
    budgetMatch,
    bedroomMatch,
    bathroomMatch,
    locationMatch,
    typeMatch,
    totalScore: Math.round(totalScore)
  };
}

/**
 * Sort properties by relevance and proximity
 * @param properties Array of properties with distances
 * @returns Sorted array
 */
export function sortPropertiesByRelevance(
  properties: PropertyWithDistance[]
): PropertyWithDistance[] {
  return properties.sort((a, b) => {
    // Primary sort: Proximity tier
    const tierOrder = ['exact', 'nearby', 'close', 'moderate', 'far'];
    const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    if (tierDiff !== 0) return tierDiff;

    // Secondary sort: Relevance score
    const scoreDiff = b.relevance.totalScore - a.relevance.totalScore;
    if (Math.abs(scoreDiff) > 5) return scoreDiff;

    // Tertiary sort: Exact distance
    return a.distance - b.distance;
  });
}
