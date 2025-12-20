/**
 * Geocoding Cache Layer
 *
 * Provides cached geocoding for the matching scorer.
 * Uses Mapbox API for geocoding with in-memory caching to avoid
 * redundant API calls (city names don't change!).
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface CacheEntry {
  coords: Coordinates | null;
  timestamp: number;
}

// In-memory cache for geocoded locations
// Key format: "location,state" in lowercase
const geoCache = new Map<string, CacheEntry>();

// Cache entries expire after 24 hours (city coordinates don't change)
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get Mapbox access token from environment
 * Checks both VITE_ prefix (for shared config) and non-prefixed version
 */
function getMapboxToken(): string | null {
  return process.env.MAPBOX_ACCESS_TOKEN ||
         process.env.VITE_MAPBOX_ACCESS_TOKEN ||
         null;
}

/**
 * Geocode a location using Mapbox API
 * @param location - Location string (city name, address, etc.)
 * @param state - State abbreviation (default: 'LA' for Louisiana)
 * @returns Coordinates or null if geocoding fails
 */
async function geocodeWithMapbox(
  location: string,
  state: string = 'LA'
): Promise<Coordinates | null> {
  const token = getMapboxToken();

  if (!token) {
    console.warn('[Geocache] Mapbox access token not found');
    return null;
  }

  try {
    const query = `${location}, ${state}`;
    const encodedQuery = encodeURIComponent(query);

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&limit=1&country=US`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[Geocache] Mapbox API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('[Geocache] No results for:', query);
      return null;
    }

    // Mapbox returns [longitude, latitude]
    const [lng, lat] = data.features[0].center;

    console.log(`[Geocache] Geocoded "${query}" -> ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    return { lat, lng };
  } catch (error) {
    console.error('[Geocache] Geocoding error:', error);
    return null;
  }
}

/**
 * Get coordinates for a location, using cache if available
 *
 * @param location - Location string (city name, address, etc.)
 * @param state - State abbreviation (default: 'LA')
 * @returns Coordinates or null
 *
 * @example
 * const coords = await getOrGeocodeLocation('Metairie', 'LA');
 * // Returns { lat: 29.9841, lng: -90.1528 }
 */
export async function getOrGeocodeLocation(
  location: string,
  state: string = 'LA'
): Promise<Coordinates | null> {
  if (!location) {
    return null;
  }

  // Normalize cache key
  const key = `${location},${state}`.toLowerCase().trim();

  // Check cache
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.coords;
  }

  // Geocode and cache result
  const coords = await geocodeWithMapbox(location, state);

  geoCache.set(key, {
    coords,
    timestamp: Date.now(),
  });

  return coords;
}

/**
 * Extract city from an address string
 * Handles formats like "123 Main St, Metairie, LA 70001"
 */
export function extractCityFromAddress(address: string): string | null {
  if (!address) return null;

  // Split by comma and look for city component
  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    // Usually: [street, city, state zip]
    // Return the second-to-last part (city)
    const cityPart = parts[parts.length - 2];

    // Remove any numbers (likely ZIP codes in city field)
    const city = cityPart.replace(/\d+/g, '').trim();

    if (city.length > 0) {
      return city;
    }
  }

  return null;
}

/**
 * Pre-warm the cache with common Louisiana cities
 * Call this at startup if you want faster initial lookups
 */
export async function prewarmCache(): Promise<void> {
  const commonCities = [
    'New Orleans',
    'Metairie',
    'Kenner',
    'Baton Rouge',
    'Shreveport',
    'Lafayette',
    'Lake Charles',
    'Bossier City',
    'Monroe',
    'Alexandria',
  ];

  console.log('[Geocache] Pre-warming cache with common LA cities...');

  for (const city of commonCities) {
    await getOrGeocodeLocation(city, 'LA');
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('[Geocache] Cache pre-warmed');
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  geoCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: geoCache.size,
    entries: Array.from(geoCache.keys()),
  };
}
