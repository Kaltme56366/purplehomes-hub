/**
 * ZIP Code Matcher - Checks if properties match buyer's preferred ZIP codes
 */

/**
 * Extracts ZIP code from a property address string
 * @param address - Full address string (e.g., "123 Main St, Phoenix, AZ 85001")
 * @returns ZIP code string or null if not found
 *
 * @example
 * extractZipFromAddress("123 Main St, Phoenix, AZ 85001");
 * // Returns: "85001"
 */
export function extractZipFromAddress(address: string): string | null {
  if (!address) return null;

  // Match 5-digit ZIP code (US format)
  const zipMatch = address.match(/\b\d{5}\b/);

  return zipMatch ? zipMatch[0] : null;
}

/**
 * Checks if a property is in one of the buyer's preferred ZIP codes
 * @param propertyAddress - Property address string
 * @param preferredZipCodes - Array of preferred ZIP codes
 * @returns True if property is in a preferred ZIP code
 *
 * @example
 * isInPreferredZip("123 Main St, Phoenix, AZ 85001", ["85001", "85003"]);
 * // Returns: true
 */
export function isInPreferredZip(
  propertyAddress: string,
  preferredZipCodes: string[]
): boolean {
  if (!preferredZipCodes || preferredZipCodes.length === 0) {
    return false;
  }

  const propertyZip = extractZipFromAddress(propertyAddress);

  if (!propertyZip) {
    return false;
  }

  return preferredZipCodes.includes(propertyZip);
}

/**
 * Filters properties by preferred ZIP codes
 * @param properties - Array of properties with address field
 * @param preferredZipCodes - Array of preferred ZIP codes
 * @returns Filtered array of properties in preferred ZIPs
 */
export function filterPropertiesByZip<T extends { address: string }>(
  properties: T[],
  preferredZipCodes: string[]
): T[] {
  if (!preferredZipCodes || preferredZipCodes.length === 0) {
    return properties;
  }

  return properties.filter(property =>
    isInPreferredZip(property.address, preferredZipCodes)
  );
}

/**
 * Normalizes ZIP code format (removes spaces, dashes)
 * @param zip - ZIP code string
 * @returns Normalized ZIP code
 */
export function normalizeZipCode(zip: string): string {
  return zip.replace(/[\s-]/g, '').substring(0, 5);
}

/**
 * Validates if a string is a valid 5-digit US ZIP code
 * @param zip - ZIP code string to validate
 * @returns True if valid ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}
