/**
 * AI Property Matching API
 * Handles running AI matching between buyers and properties
 * Uses distance-based scoring with Mapbox geocoding
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { geocodeLocation } from './geocoder';
import { generateMatchScore } from './scorer';
import type { MatchScore } from './scorer';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEOCODING_API_KEY = process.env.OPENAI_API_KEY; // Use OpenAI for geocoding
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Matching API] Request:', {
    method: req.method,
    action: req.query.action,
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({
      error: 'Airtable credentials not configured',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'health':
        // Health check endpoint to verify function is working
        return res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          env: {
            hasAirtableKey: !!AIRTABLE_API_KEY,
            hasAirtableBase: !!AIRTABLE_BASE_ID,
            hasOpenAIKey: !!OPENAI_API_KEY,
          },
          node: process.version,
        });

      case 'run':
        return await handleRunMatching(req, res, headers);

      case 'run-buyer':
        return await handleRunBuyerMatching(req, res, headers);

      case 'run-property':
        return await handleRunPropertyMatching(req, res, headers);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Matching API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      stack: error.stack,
    });
  }
}

/**
 * Ensures all buyers have geocoded coordinates
 * Geocodes buyers that don't have Latitude/Longitude and updates Airtable
 *
 * @param buyers - Array of buyer records
 * @param headers - Airtable API headers
 * @param options - Configuration options
 */
async function ensureBuyerGeocoding(
  buyers: any[],
  headers: any,
  options: { enabled?: boolean; maxBuyers?: number } = {}
): Promise<void> {
  const { enabled = false, maxBuyers = 10 } = options;

  // Skip geocoding if not enabled
  if (!enabled) {
    const missingCoords = buyers.filter(b => !b.fields.Latitude || !b.fields.Longitude).length;
    if (missingCoords > 0) {
      console.warn(`[Geocoding] Skipped geocoding for ${missingCoords} buyers (geocoding disabled for performance). Run with geocoding enabled to update coordinates.`);
    }
    return;
  }

  if (!GEOCODING_API_KEY) {
    console.warn('[Matching] OpenAI API key not configured, skipping geocoding');
    return;
  }

  // Filter buyers that need geocoding
  const buyersNeedingGeocode = buyers.filter(b => !b.fields.Latitude || !b.fields.Longitude);

  if (buyersNeedingGeocode.length === 0) {
    console.log('[Geocoding] All buyers already have coordinates');
    return;
  }

  // Limit the number of buyers to geocode per run to prevent timeout
  const buyersToGeocode = buyersNeedingGeocode.slice(0, maxBuyers);
  const remaining = buyersNeedingGeocode.length - buyersToGeocode.length;

  if (remaining > 0) {
    console.warn(`[Geocoding] Limiting geocoding to ${maxBuyers} buyers (${remaining} remaining). Run again to continue.`);
  }

  let geocoded = 0;

  for (const buyer of buyersToGeocode) {
    // Get location string from buyer
    const location = buyer.fields['Preferred Location'] || buyer.fields['Location'] || buyer.fields['City'];

    if (!location) {
      console.log(`[Geocoding] Buyer ${buyer.id} has no location data, skipping`);
      continue;
    }

    // Geocode location
    console.log(`[Geocoding] Geocoding buyer ${buyer.id}: "${location}"`);
    const result = await geocodeLocation(location, GEOCODING_API_KEY);

    if (!result) {
      console.warn(`[Geocoding] Failed to geocode "${location}" for buyer ${buyer.id}`);
      continue;
    }

    // Update buyer in Airtable with coordinates
    try {
      await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${buyer.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            Latitude: result.lat,
            Longitude: result.lng,
          },
        }),
      });

      // Update local copy for this matching run
      buyer.fields.Latitude = result.lat;
      buyer.fields.Longitude = result.lng;

      geocoded++;
      console.log(`[Geocoding] Updated buyer ${buyer.id} with coordinates: ${result.lat}, ${result.lng}`);
    } catch (error) {
      console.error(`[Geocoding] Failed to update buyer ${buyer.id}:`, error);
    }
  }

  if (geocoded > 0) {
    console.log(`[Geocoding] Successfully geocoded ${geocoded} buyers`);
  }
}

/**
 * Fetches existing matches and builds a skip set for duplicate prevention
 * Returns Set of "contactId:propertyCode" keys
 */
async function fetchExistingMatchesSkipSet(headers: any, refreshAll: boolean): Promise<Set<string>> {
  if (refreshAll) {
    console.log('[Matching] refreshAll=true, skipping duplicate check');
    return new Set();
  }

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
      { headers }
    );

    if (!res.ok) {
      console.warn('[Matching] Failed to fetch existing matches, proceeding without skip set');
      return new Set();
    }

    const data = await res.json();
    const skipSet = new Set<string>();

    for (const match of data.records || []) {
      const contactIds = match.fields['Contact ID'] || [];
      const propertyCodes = match.fields['Property Code'] || [];

      // Build skip keys for all combinations (handles linked records)
      for (const cid of contactIds) {
        for (const pid of propertyCodes) {
          skipSet.add(`${cid}:${pid}`);
        }
      }
    }

    console.log(`[Matching] Built skip set with ${skipSet.size} existing matches`);
    return skipSet;

  } catch (error) {
    console.error('[Matching] Error building skip set:', error);
    return new Set();
  }
}

/**
 * Run matching for all buyers against all properties
 */
async function handleRunMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const startTime = Date.now();
  const { minScore = 30, refreshAll = false, enableGeocoding = false } = req.body || {};

  console.log('[Matching] Starting full matching', { minScore, refreshAll, enableGeocoding, timestamp: new Date().toISOString() });

  try {
    // Fetch all buyers
    console.log('[Matching] Fetching buyers from Airtable...');
    const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
    if (!buyersRes.ok) {
      const errorText = await buyersRes.text();
      console.error('[Matching] Failed to fetch buyers:', buyersRes.status, errorText);
      throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
    }
    const buyersData = await buyersRes.json();
    const buyers = buyersData.records || [];
    console.log(`[Matching] Fetched ${buyers.length} buyers in ${Date.now() - startTime}ms`);

    // Fetch all properties
    console.log('[Matching] Fetching properties from Airtable...');
    const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
    if (!propertiesRes.ok) {
      const errorText = await propertiesRes.text();
      console.error('[Matching] Failed to fetch properties:', propertiesRes.status, errorText);
      throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
    }
    const propertiesData = await propertiesRes.json();
    const properties = propertiesData.records || [];
    console.log(`[Matching] Fetched ${properties.length} properties in ${Date.now() - startTime}ms`);

    if (buyers.length === 0 || properties.length === 0) {
      console.warn('[Matching] No buyers or properties found, skipping matching');
      return res.status(200).json({
        success: true,
        message: 'No buyers or properties found to match',
        stats: { buyersProcessed: 0, propertiesProcessed: 0, matchesCreated: 0, matchesUpdated: 0, duplicatesSkipped: 0, withinRadius: 0 },
      });
    }

    console.log(`[Matching] Processing ${buyers.length} buyers × ${properties.length} properties = ${buyers.length * properties.length} combinations`);

    // Geocode buyers (disabled by default for performance)
    await ensureBuyerGeocoding(buyers, headers, { enabled: enableGeocoding, maxBuyers: 10 });

    // Build skip set for duplicate prevention
    const skipSet = await fetchExistingMatchesSkipSet(headers, refreshAll);

    let matchesCreated = 0;
    let matchesUpdated = 0;
    let duplicatesSkipped = 0;
    let withinRadius = 0;
    let errors = 0;

    // Process each buyer
    console.log('[Matching] Starting matching loop...');
    const totalCombinations = buyers.length * properties.length;
    let processed = 0;
    const progressInterval = Math.max(1, Math.floor(totalCombinations / 10)); // Log every 10%

    for (const buyer of buyers) {
      for (const property of properties) {
        processed++;

        // Log progress periodically
        if (processed % progressInterval === 0 || processed === totalCombinations) {
          const elapsed = Date.now() - startTime;
          const progress = (processed / totalCombinations * 100).toFixed(1);
          console.log(`[Matching] Progress: ${progress}% (${processed}/${totalCombinations}) - ${elapsed}ms elapsed`);
        }

        // Check skip set
        const pairKey = `${buyer.id}:${property.id}`;
        if (skipSet.has(pairKey)) {
          duplicatesSkipped++;
          continue;
        }

        try {
          // Generate match score using distance-based scoring
          const score = generateMatchScore(buyer, property);

          if (score.score >= minScore) {
            // Create or update match
            const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
            if (matchResult.created) {
              matchesCreated++;
            } else {
              matchesUpdated++;
            }

            if (score.isPriority) {
              withinRadius++;
            }
          }
        } catch (error) {
          errors++;
          console.error(`[Matching] Error processing buyer ${buyer.id} × property ${property.id}:`, error);
          // Continue processing other matches even if one fails
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Matching] Completed in ${totalTime}ms`, {
      matchesCreated,
      matchesUpdated,
      duplicatesSkipped,
      withinRadius,
      errors,
    });

    return res.status(200).json({
      success: true,
      message: `Matching complete! Created ${matchesCreated} new matches, updated ${matchesUpdated}, skipped ${duplicatesSkipped} duplicates.`,
      stats: {
        buyersProcessed: buyers.length,
        propertiesProcessed: properties.length,
        matchesCreated,
        matchesUpdated,
        duplicatesSkipped,
        withinRadius,
        errors,
        timeMs: totalTime,
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Matching] Fatal error after ${elapsed}ms:`, error);
    throw error; // Re-throw to be caught by top-level handler
  }
}

/**
 * Run matching for a single buyer
 */
async function handleRunBuyerMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { contactId } = req.query;
  const { minScore = 30 } = req.body || {};

  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }

  console.log('[Matching] Running matching for buyer:', contactId);

  // Fetch buyer
  const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
  const buyerRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
    { headers }
  );
  if (!buyerRes.ok) throw new Error('Failed to fetch buyer');
  const buyerData = await buyerRes.json();

  if (!buyerData.records || buyerData.records.length === 0) {
    return res.status(404).json({ error: 'Buyer not found' });
  }

  const buyer = buyerData.records[0];

  // Geocode buyer if needed (disabled by default for performance)
  await ensureBuyerGeocoding([buyer], headers, { enabled: false });

  // Fetch all properties
  const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
  if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
  const propertiesData = await propertiesRes.json();
  const properties = propertiesData.records;

  let matchesCreated = 0;
  let matchesUpdated = 0;
  let withinRadius = 0;

  // Match against all properties
  for (const property of properties) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
      if (matchResult.created) {
        matchesCreated++;
      } else {
        matchesUpdated++;
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} matches for ${buyer.fields['First Name']} ${buyer.fields['Last Name']}`,
    stats: {
      buyersProcessed: 1,
      propertiesProcessed: properties.length,
      matchesCreated,
      matchesUpdated,
      withinRadius,
    },
  });
}

/**
 * Run matching for a single property
 */
async function handleRunPropertyMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { propertyCode } = req.query;
  const { minScore = 30 } = req.body || {};

  if (!propertyCode) {
    return res.status(400).json({ error: 'propertyCode is required' });
  }

  console.log('[Matching] Running matching for property:', propertyCode);

  // Fetch property
  const propertyFormula = encodeURIComponent(`{Property Code} = "${propertyCode}"`);
  const propertyRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${propertyFormula}`,
    { headers }
  );
  if (!propertyRes.ok) throw new Error('Failed to fetch property');
  const propertyData = await propertyRes.json();

  if (!propertyData.records || propertyData.records.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const property = propertyData.records[0];

  // Fetch all buyers
  const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
  if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
  const buyersData = await buyersRes.json();
  const buyers = buyersData.records;

  // Geocode buyers if needed (disabled by default for performance)
  await ensureBuyerGeocoding(buyers, headers, { enabled: false });

  let matchesCreated = 0;
  let matchesUpdated = 0;
  let withinRadius = 0;

  // Match against all buyers
  for (const buyer of buyers) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
      if (matchResult.created) {
        matchesCreated++;
      } else {
        matchesUpdated++;
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} buyer matches for property ${propertyCode}`,
    stats: {
      buyersProcessed: buyers.length,
      propertiesProcessed: 1,
      matchesCreated,
      matchesUpdated,
      withinRadius,
    },
  });
}

/**
 * Create or update match in Airtable
 */
async function createOrUpdateMatch(buyer: any, property: any, score: MatchScore, headers: any): Promise<{created: boolean}> {
  try {
    // Check if match already exists
    const formula = encodeURIComponent(
      `AND(SEARCH("${buyer.id}", ARRAYJOIN({Contact ID})), SEARCH("${property.id}", ARRAYJOIN({Property Code})))`
    );

    const existingRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${formula}`,
      { headers }
    );

    // Build match notes
    let matchNotes = score.reasoning;
    matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
    if (score.concerns && score.concerns.length > 0) {
      matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
    }

    // Build fields object
    const matchFields: any = {
      'Match Score': score.score,
      'Match Notes': matchNotes,
      'Match Status': 'Active',
      'Priority': score.isPriority,
    };

    // Add distance if available
    if (score.distance !== undefined) {
      matchFields['Distance'] = score.distance;
    }

    if (existingRes.ok) {
      const existingData = await existingRes.json();

      if (existingData.records && existingData.records.length > 0) {
        // Update existing
        const matchId = existingData.records[0].id;
        const updateRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches/${matchId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields: matchFields }),
        });

        if (!updateRes.ok) {
          const errorText = await updateRes.text();
          console.error(`[Matching] Failed to update match ${matchId}:`, updateRes.status, errorText);
          throw new Error(`Failed to update match: ${updateRes.status}`);
        }

        return { created: false };
      }
    }

    // Create new match
    matchFields['Property Code'] = [property.id];
    matchFields['Contact ID'] = [buyer.id];

    const createRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields: matchFields }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('[Matching] Failed to create match:', createRes.status, errorText);
      throw new Error(`Failed to create match: ${createRes.status}`);
    }

    return { created: true };
  } catch (error) {
    console.error('[Matching] Error in createOrUpdateMatch:', error);
    throw error;
  }
}
