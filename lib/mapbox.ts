/**
 * Mapbox Geocoding Utility (Server-Side)
 *
 * Converts addresses and city names to lat/lng coordinates
 * using the Mapbox Geocoding API.
 */

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MAPBOX_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  source: 'address' | 'city' | 'zip';
  confidence: 'high' | 'medium' | 'low';
}

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

interface MapboxResponse {
  type: string;
  features: MapboxFeature[];
  attribution: string;
}

/**
 * Geocode a query string using Mapbox Geocoding API
 *
 * @param query - Search query (address, city name, etc.)
 * @param options - Optional parameters
 * @returns GeocodeResult or null if geocoding fails
 */
export async function geocode(
  query: string,
  options: {
    types?: string[];
    country?: string;
  } = {}
): Promise<GeocodeResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('[Mapbox] Access token not configured');
    return null;
  }

  if (!query || query.trim().length === 0) {
    return null;
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const types = options.types?.join(',') || 'address,place,postcode';
    const country = options.country || 'us';

    const url = `${MAPBOX_API_URL}/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=${country}&types=${types}&limit=1`;

    console.log(`[Mapbox] Geocoding: "${query}"`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Mapbox] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn(`[Mapbox] No results for: "${query}"`);
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;

    // Determine source type based on place_type
    let source: 'address' | 'city' | 'zip' = 'city';
    if (feature.place_type.includes('address')) {
      source = 'address';
    } else if (feature.place_type.includes('postcode')) {
      source = 'zip';
    } else if (feature.place_type.includes('place') || feature.place_type.includes('locality')) {
      source = 'city';
    }

    // Determine confidence based on relevance score
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (feature.relevance >= 0.9) {
      confidence = 'high';
    } else if (feature.relevance >= 0.7) {
      confidence = 'medium';
    }

    console.log(`[Mapbox] Success: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${source}, ${confidence})`);

    return {
      lat,
      lng,
      formattedAddress: feature.place_name,
      source,
      confidence,
    };
  } catch (error) {
    console.error('[Mapbox] Error:', error);
    return null;
  }
}

/**
 * Geocode a full address
 *
 * @param address - Street address
 * @param city - City name (optional)
 * @param state - State abbreviation (optional)
 * @param zip - ZIP code (optional)
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodeResult | null> {
  const parts = [address];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zip) parts.push(zip);

  const query = parts.join(', ');
  const result = await geocode(query, { types: ['address', 'place'] });

  if (result) {
    result.source = 'address';
  }

  return result;
}

/**
 * Geocode a city name
 *
 * @param city - City name
 * @param state - State abbreviation
 */
export async function geocodeCity(
  city: string,
  state: string
): Promise<GeocodeResult | null> {
  const query = `${city}, ${state}`;
  const result = await geocode(query, { types: ['place', 'locality'] });

  if (result) {
    result.source = 'city';
  }

  return result;
}

/**
 * Geocode a ZIP code
 *
 * @param zip - 5-digit ZIP code
 * @param state - State abbreviation (optional, improves accuracy)
 */
export async function geocodeZip(
  zip: string,
  state?: string
): Promise<GeocodeResult | null> {
  const query = state ? `${zip}, ${state}` : zip;
  const result = await geocode(query, { types: ['postcode'] });

  if (result) {
    result.source = 'zip';
  }

  return result;
}

/**
 * Geocode a buyer's location based on available data
 * Priority: City > Preferred Location > First Preferred ZIP
 *
 * @param buyer - Buyer data with location fields
 */
export async function geocodeBuyerLocation(buyer: {
  city?: string;
  preferredLocation?: string;
  state?: string;
  preferredZipCodes?: string[];
}): Promise<GeocodeResult | null> {
  const state = buyer.state || 'LA'; // Default to Louisiana

  // Try City first
  if (buyer.city) {
    const result = await geocodeCity(buyer.city, state);
    if (result) return result;
  }

  // Try Preferred Location
  if (buyer.preferredLocation) {
    const result = await geocode(`${buyer.preferredLocation}, ${state}`, { types: ['place', 'locality', 'neighborhood'] });
    if (result) {
      result.source = 'city';
      return result;
    }
  }

  // Fallback to first preferred ZIP
  if (buyer.preferredZipCodes && buyer.preferredZipCodes.length > 0) {
    const result = await geocodeZip(buyer.preferredZipCodes[0], state);
    if (result) return result;
  }

  return null;
}

/**
 * Geocode a property's location based on available data
 * Priority: Full Address > City + ZIP
 *
 * @param property - Property data with location fields
 */
export async function geocodePropertyLocation(property: {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): Promise<GeocodeResult | null> {
  const state = property.state || 'LA'; // Default to Louisiana

  // Try full address first
  if (property.address) {
    const result = await geocodeAddress(
      property.address,
      property.city,
      state,
      property.zipCode
    );
    if (result) return result;
  }

  // Fallback to city + ZIP
  if (property.city || property.zipCode) {
    const query = [property.city, state, property.zipCode].filter(Boolean).join(', ');
    const result = await geocode(query, { types: ['place', 'postcode'] });
    if (result) {
      result.source = property.zipCode ? 'zip' : 'city';
      return result;
    }
  }

  return null;
}

/**
 * Batch geocode multiple queries with rate limiting
 *
 * @param queries - Array of query strings
 * @param delayMs - Delay between requests (default 100ms for 10 req/sec)
 */
export async function batchGeocode(
  queries: string[],
  delayMs: number = 100
): Promise<(GeocodeResult | null)[]> {
  console.log(`[Mapbox] Batch geocoding ${queries.length} queries`);

  const results: (GeocodeResult | null)[] = [];

  for (let i = 0; i < queries.length; i++) {
    const result = await geocode(queries[i]);
    results.push(result);

    // Add delay between requests (except for the last one)
    if (i < queries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successful = results.filter(r => r !== null).length;
  console.log(`[Mapbox] Batch complete: ${successful}/${queries.length} successful`);

  return results;
}

/**
 * Check if Mapbox access token is configured
 */
export function isMapboxConfigured(): boolean {
  return !!MAPBOX_ACCESS_TOKEN;
}
