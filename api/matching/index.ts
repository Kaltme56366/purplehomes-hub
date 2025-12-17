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
    });
  }
}

/**
 * Ensures all buyers have geocoded coordinates
 * Geocodes buyers that don't have Latitude/Longitude and updates Airtable
 */
async function ensureBuyerGeocoding(buyers: any[], headers: any): Promise<void> {
  if (!GEOCODING_API_KEY) {
    console.warn('[Matching] OpenAI API key not configured, skipping geocoding');
    return;
  }

  let geocoded = 0;

  for (const buyer of buyers) {
    // Skip if already has coordinates
    if (buyer.fields.Latitude && buyer.fields.Longitude) {
      continue;
    }

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
  const { minScore = 30, refreshAll = false } = req.body || {};

  console.log('[Matching] Running full matching with minScore:', minScore, 'refreshAll:', refreshAll);

  // Fetch all buyers
  const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
  if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
  const buyersData = await buyersRes.json();
  const buyers = buyersData.records;

  // Fetch all properties
  const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
  if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
  const propertiesData = await propertiesRes.json();
  const properties = propertiesData.records;

  console.log(`[Matching] Found ${buyers.length} buyers and ${properties.length} properties`);

  // Geocode buyers (if needed)
  await ensureBuyerGeocoding(buyers, headers);

  // Build skip set for duplicate prevention
  const skipSet = await fetchExistingMatchesSkipSet(headers, refreshAll);

  let matchesCreated = 0;
  let matchesUpdated = 0;
  let duplicatesSkipped = 0;
  let withinRadius = 0;

  // Process each buyer
  for (const buyer of buyers) {
    for (const property of properties) {
      // Check skip set
      const pairKey = `${buyer.id}:${property.id}`;
      if (skipSet.has(pairKey)) {
        duplicatesSkipped++;
        continue;
      }

      // Generate match score using new distance-based scoring
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
    }
  }

  return res.status(200).json({
    success: true,
    message: `Matching complete! Created ${matchesCreated} new matches, skipped ${duplicatesSkipped} duplicates.`,
    stats: {
      buyersProcessed: buyers.length,
      propertiesProcessed: properties.length,
      matchesCreated,
      matchesUpdated,
      duplicatesSkipped,
      withinRadius,
    },
  });
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

  // Geocode buyer if needed
  await ensureBuyerGeocoding([buyer], headers);

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

  // Geocode buyers if needed
  await ensureBuyerGeocoding(buyers, headers);

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
      await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches/${matchId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: matchFields }),
      });
      return { created: false };
    }
  }

  // Create new match
  matchFields['Property Code'] = [property.id];
  matchFields['Contact ID'] = [buyer.id];

  await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields: matchFields }),
  });

  return { created: true };
}
