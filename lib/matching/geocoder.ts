/**
 * Geocoding Utility - Converts location strings to lat/lng coordinates
 * Uses OpenAI GPT-4o-mini for geocoding
 */

interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface OpenAIGeocodingResponse {
  lat: number | null;
  lng: number | null;
  formattedAddress: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Helper function to geocode using OpenAI API
 * @param locationString - Location string to geocode
 * @param openaiApiKey - OpenAI API key
 * @param retryCount - Current retry attempt (for rate limiting)
 * @returns GeocodedLocation object or null
 */
async function geocodeLocationWithOpenAI(
  locationString: string,
  openaiApiKey: string,
  retryCount = 0
): Promise<GeocodedLocation | null> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    const systemPrompt = `You are a geographic information system. Your task is to convert location strings into precise latitude/longitude coordinates.

Rules:
- Return the geographic center point for cities, states, or regions
- Use the most populous or commonly-referenced location when multiple exist
- Return coordinates with 4-6 decimal places of precision
- Return a properly formatted address in standard US format
- If the location is ambiguous, make the most reasonable assumption (e.g., "Phoenix" = "Phoenix, Arizona")
- If the location is completely invalid or nonsensical, return null values

Output Format: You must return ONLY a JSON object with this exact structure:
{
  "lat": <number or null>,
  "lng": <number or null>,
  "formattedAddress": <string or null>,
  "confidence": <"high" | "medium" | "low">
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Convert this location to coordinates: "${locationString}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    // Handle rate limiting with retry
    if (response.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.warn(`[Geocoder] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return geocodeLocationWithOpenAI(locationString, openaiApiKey, retryCount + 1);
    }

    if (!response.ok) {
      console.error('[Geocoder] OpenAI API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Geocoder] No response from OpenAI');
      return null;
    }

    // Parse JSON response
    const parsed: OpenAIGeocodingResponse = JSON.parse(content);

    // Validate response
    if (parsed.lat === null || parsed.lng === null || parsed.formattedAddress === null) {
      console.warn(`[Geocoder] OpenAI returned null values for: "${locationString}"`);
      return null;
    }

    // Validate coordinate ranges
    if (parsed.lat < -90 || parsed.lat > 90 || parsed.lng < -180 || parsed.lng > 180) {
      console.error(`[Geocoder] Invalid coordinates: lat=${parsed.lat}, lng=${parsed.lng}`);
      return null;
    }

    // Log confidence level
    if (parsed.confidence === 'low') {
      console.warn(`[Geocoder] Low confidence result for: "${locationString}"`);
    }

    return {
      lat: parsed.lat,
      lng: parsed.lng,
      formattedAddress: parsed.formattedAddress,
    };

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Geocoder] Failed to parse OpenAI JSON response:', error);
    } else {
      console.error('[Geocoder] Error:', error);
    }
    return null;
  }
}

/**
 * Geocodes a location string to lat/lng coordinates using OpenAI API
 * @param locationString - Location string (e.g., "Phoenix, AZ", "New York, NY")
 * @param apiKey - OpenAI API key
 * @returns GeocodedLocation object or null if geocoding fails
 *
 * @example
 * const result = await geocodeLocation("Phoenix, AZ", openaiKey);
 * // { lat: 33.4484, lng: -112.0740, formattedAddress: "Phoenix, Arizona, United States" }
 */
export async function geocodeLocation(
  locationString: string,
  apiKey: string
): Promise<GeocodedLocation | null> {
  try {
    // Validate inputs
    if (!locationString || !apiKey) {
      console.error('[Geocoder] Missing location string or API key');
      return null;
    }

    console.log(`[Geocoder] Geocoding: "${locationString}"`);

    const result = await geocodeLocationWithOpenAI(locationString, apiKey);

    if (result) {
      console.log(`[Geocoder] Success: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
    }

    return result;

  } catch (error) {
    console.error('[Geocoder] Error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple locations with rate limiting
 * @param locations - Array of location strings
 * @param apiKey - OpenAI API key
 * @returns Array of GeocodedLocation objects (null for failed geocodes)
 */
export async function batchGeocodeLocations(
  locations: string[],
  apiKey: string
): Promise<(GeocodedLocation | null)[]> {
  console.log(`[Geocoder] Batch geocoding ${locations.length} locations`);

  const batchSize = 5; // Process 5 at a time
  const delayMs = 200; // 200ms delay between batches
  const results: (GeocodedLocation | null)[] = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(locations.length / batchSize);

    console.log(`[Geocoder] Processing batch ${batchNumber}/${totalBatches} (${batch.length} locations)`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(location => geocodeLocation(location, apiKey))
    );

    results.push(...batchResults);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < locations.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successful = results.filter(r => r !== null).length;
  console.log(`[Geocoder] Batch complete: ${successful}/${locations.length} successful`);

  return results;
}
