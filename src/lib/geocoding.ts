/**
 * Geocoding Utilities
 *
 * Converts real addresses to latitude/longitude coordinates
 * for Mapbox integration and proximity calculations
 */

import type { Coordinates } from './proximityCalculator';

/**
 * Geocode an address using Mapbox Geocoding API
 *
 * @param address Full address string (e.g., "123 Main St, Phoenix, AZ 85001")
 * @returns Coordinates object with latitude and longitude, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('Mapbox access token not found. Geocoding disabled.');
    return null;
  }

  try {
    // URL encode the address
    const encodedAddress = encodeURIComponent(address);

    // Mapbox Geocoding API endpoint
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Mapbox geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    // Extract coordinates from the first result
    // Mapbox returns coordinates as [longitude, latitude]
    const [longitude, latitude] = data.features[0].center;

    return {
      latitude,
      longitude
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Geocode address from separate components
 *
 * @param street Street address (e.g., "123 Main St")
 * @param city City name (e.g., "Phoenix, AZ 85001" or just "Phoenix")
 * @returns Coordinates object or null
 */
export async function geocodeFromComponents(
  street: string,
  city: string
): Promise<Coordinates | null> {
  // Combine into full address
  const fullAddress = `${street}, ${city}`;
  return geocodeAddress(fullAddress);
}

/**
 * Extract ZIP code from city string
 *
 * @param city City string that may include ZIP (e.g., "Phoenix, AZ 85001")
 * @returns ZIP code or null
 */
export function extractZipCode(city: string): string | null {
  const zipMatch = city.match(/\b\d{5}\b/);
  return zipMatch ? zipMatch[0] : null;
}

/**
 * Batch geocode multiple addresses
 * Rate limited to avoid API limits (max 10 requests per second)
 *
 * @param addresses Array of address strings
 * @returns Array of coordinates (null for failed geocodes)
 */
export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<(Coordinates | null)[]> {
  const results: (Coordinates | null)[] = [];
  const DELAY_MS = 100; // 10 requests per second max

  for (let i = 0; i < addresses.length; i++) {
    const coords = await geocodeAddress(addresses[i]);
    results.push(coords);

    // Add delay between requests to respect rate limits
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

/**
 * Validate and clean address string
 *
 * @param address Raw address string
 * @returns Cleaned address or null if invalid
 */
export function cleanAddress(address: string): string | null {
  if (!address || address.trim().length === 0) {
    return null;
  }

  // Remove excessive whitespace
  let cleaned = address.trim().replace(/\s+/g, ' ');

  // Basic validation: should have at least a number and a street name
  const hasNumber = /\d/.test(cleaned);
  const hasStreet = /[a-zA-Z]/.test(cleaned);

  if (!hasNumber || !hasStreet) {
    console.warn('Invalid address format:', address);
    return null;
  }

  return cleaned;
}

/**
 * Create full address from property data
 *
 * @param property Property object with address and city
 * @returns Full address string
 */
export function createFullAddress(property: { address: string; city: string }): string {
  return `${property.address}, ${property.city}`;
}

/**
 * Geocode a property and return updated property with coordinates
 *
 * Usage in Airtable sync:
 * ```typescript
 * const propertyWithCoords = await geocodeProperty(property);
 * ```
 */
export async function geocodeProperty<T extends { address: string; city: string }>(
  property: T
): Promise<T & { lat?: number; lng?: number }> {
  const fullAddress = createFullAddress(property);
  const coords = await geocodeAddress(fullAddress);

  if (coords) {
    return {
      ...property,
      lat: coords.latitude,
      lng: coords.longitude
    };
  }

  // Return property without coordinates if geocoding failed
  return property;
}

/**
 * Check if property has valid coordinates
 */
export function hasValidCoordinates(property: { lat?: number; lng?: number }): boolean {
  return (
    typeof property.lat === 'number' &&
    typeof property.lng === 'number' &&
    !isNaN(property.lat) &&
    !isNaN(property.lng) &&
    property.lat >= -90 &&
    property.lat <= 90 &&
    property.lng >= -180 &&
    property.lng <= 180
  );
}

/**
 * Fallback: Use ZIP code coordinates if geocoding fails
 *
 * @param property Property with city field
 * @param zipCoordinates ZIP code coordinate lookup from proximityCalculator
 */
export function fallbackToZipCoordinates(
  property: { city: string },
  zipCoordinates: Record<string, Coordinates>
): { lat?: number; lng?: number } {
  const zip = extractZipCode(property.city);

  if (!zip) {
    return {};
  }

  const coords = zipCoordinates[zip];

  if (!coords) {
    return {};
  }

  return {
    lat: coords.latitude,
    lng: coords.longitude
  };
}
