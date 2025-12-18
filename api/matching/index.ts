/**
 * Property Matching API
 * Handles running matching between buyers and properties
 * Uses field-based scoring with ZIP code matching
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMatchScore } from './scorer';
import type { MatchScore } from './scorer';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
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

// Geocoding removed - using ZIP code matching only

/**
 * Fetches cached data from System Cache table
 * Returns null if cache is not available or invalid
 */
async function fetchCachedData(cacheKey: string, headers: any): Promise<any | null> {
  try {
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const cacheRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache?filterByFormula=${formula}`,
      { headers }
    );

    if (!cacheRes.ok) {
      console.warn(`[Matching] Failed to fetch cache for ${cacheKey}, will use direct Airtable query`);
      return null;
    }

    const cacheData = await cacheRes.json();
    const record = cacheData.records?.[0];

    if (!record || !record.fields.is_valid) {
      console.warn(`[Matching] Cache not found or invalid for ${cacheKey}, will use direct Airtable query`);
      return null;
    }

    const data = JSON.parse(record.fields.data || '{"records":[]}');
    console.log(`[Matching] Loaded ${data.records?.length || 0} records from cache: ${cacheKey}`);
    return data;

  } catch (error) {
    console.error(`[Matching] Error fetching cache for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Invalidates a cache entry by setting is_valid to false
 */
async function invalidateCache(cacheKey: string, headers: any): Promise<void> {
  try {
    const formula = encodeURIComponent(`{cache_key} = "${cacheKey}"`);
    const findRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache?filterByFormula=${formula}`,
      { headers }
    );

    if (!findRes.ok) return;

    const findData = await findRes.json();
    const recordId = findData.records?.[0]?.id;

    if (recordId) {
      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/System%20Cache/${recordId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: { is_valid: false }
          })
        }
      );
      console.log(`[Matching] Invalidated cache: ${cacheKey}`);
    }
  } catch (error) {
    console.error(`[Matching] Error invalidating cache for ${cacheKey}:`, error);
  }
}

/**
 * Fetches existing matches and builds both a skip set and a match ID map
 * Returns { skipSet, matchMap } where matchMap is "contactId:propertyCode" -> matchRecordId
 */
async function fetchExistingMatches(headers: any, refreshAll: boolean): Promise<{
  skipSet: Set<string>;
  matchMap: Map<string, string>;
}> {
  if (refreshAll) {
    console.log('[Matching] refreshAll=true, will re-create all matches');
    return { skipSet: new Set(), matchMap: new Map() };
  }

  try {
    // Try to fetch from cache first
    console.log('[Matching] Attempting to fetch existing matches from cache...');
    const cachedMatches = await fetchCachedData('matches', headers);
    let matchRecords = cachedMatches?.records || [];

    // Fallback to direct Airtable query if cache unavailable
    if (!cachedMatches || matchRecords.length === 0) {
      console.log('[Matching] Cache miss - fetching matches from Airtable...');
      const res = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        { headers }
      );

      if (!res.ok) {
        console.warn('[Matching] Failed to fetch existing matches, proceeding without skip set');
        return { skipSet: new Set(), matchMap: new Map() };
      }

      const data = await res.json();
      matchRecords = data.records || [];
    }

    const skipSet = new Set<string>();
    const matchMap = new Map<string, string>();

    for (const match of matchRecords) {
      const contactIds = match.fields['Contact ID'] || [];
      const propertyCodes = match.fields['Property Code'] || [];

      // Build skip keys and match ID map for all combinations (handles linked records)
      for (const cid of contactIds) {
        for (const pid of propertyCodes) {
          const key = `${cid}:${pid}`;
          skipSet.add(key);
          matchMap.set(key, match.id); // Store Airtable record ID for updates
        }
      }
    }

    console.log(`[Matching] Loaded ${skipSet.size} existing matches into memory`);
    return { skipSet, matchMap };

  } catch (error) {
    console.error('[Matching] Error loading existing matches:', error);
    return { skipSet: new Set(), matchMap: new Map() };
  }
}

/**
 * Batch create new matches in Airtable (up to 10 per request, 5 concurrent)
 */
async function batchCreateMatches(matches: any[], headers: any): Promise<number> {
  if (matches.length === 0) return 0;

  const BATCH_SIZE = 10;
  const CONCURRENCY = 5;

  const executeBatch = async (batch: any[]): Promise<number> => {
    try {
      const createRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ records: batch }),
        }
      );
      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error(`[Matching] Batch create failed:`, createRes.status, errorText);
        return 0;
      }
      return batch.length;
    } catch (error) {
      console.error(`[Matching] Error in batch create:`, error);
      return 0;
    }
  };

  return parallelBatchExecute(matches, BATCH_SIZE, CONCURRENCY, executeBatch);
}

/**
 * Execute batches in parallel with concurrency limit
 */
async function parallelBatchExecute<T>(
  items: T[],
  batchSize: number,
  concurrency: number,
  executor: (batch: T[]) => Promise<number>
): Promise<number> {
  if (items.length === 0) return 0;

  // Split into batches of batchSize
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  let totalProcessed = 0;

  // Process batches in parallel chunks of 'concurrency'
  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(batch => executor(batch)));
    totalProcessed += results.reduce((sum, n) => sum + n, 0);
  }

  return totalProcessed;
}

/**
 * Batch update existing matches in Airtable (up to 10 per request, 5 concurrent)
 */
async function batchUpdateMatches(updates: any[], headers: any): Promise<number> {
  if (updates.length === 0) return 0;

  const BATCH_SIZE = 10;
  const CONCURRENCY = 5;

  const executeBatch = async (batch: any[]): Promise<number> => {
    try {
      const updateRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ records: batch }),
        }
      );
      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error(`[Matching] Batch update failed:`, updateRes.status, errorText);
        return 0;
      }
      return batch.length;
    } catch (error) {
      console.error(`[Matching] Error in batch update:`, error);
      return 0;
    }
  };

  return parallelBatchExecute(updates, BATCH_SIZE, CONCURRENCY, executeBatch);
}

/**
 * Run matching for all buyers against all properties
 */
async function handleRunMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const startTime = Date.now();
  const { minScore = 30, refreshAll = false } = req.body || {};

  console.log('[Matching] Starting full matching', { minScore, refreshAll, timestamp: new Date().toISOString() });

  try {
    // Try to fetch buyers from cache first
    console.log('[Matching] Attempting to fetch buyers from cache...');
    let buyersData = await fetchCachedData('buyers', headers);
    let buyers = buyersData?.records || [];

    // Fallback to direct Airtable query if cache unavailable
    if (!buyersData || buyers.length === 0) {
      console.log('[Matching] Cache miss - fetching buyers from Airtable...');
      const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
      if (!buyersRes.ok) {
        const errorText = await buyersRes.text();
        console.error('[Matching] Failed to fetch buyers:', buyersRes.status, errorText);
        throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
      }
      const directBuyersData = await buyersRes.json();
      buyers = directBuyersData.records || [];
    }
    console.log(`[Matching] Loaded ${buyers.length} buyers in ${Date.now() - startTime}ms`);

    // Try to fetch properties from cache first
    console.log('[Matching] Attempting to fetch properties from cache...');
    let propertiesData = await fetchCachedData('properties', headers);
    let properties = propertiesData?.records || [];

    // Fallback to direct Airtable query if cache unavailable
    if (!propertiesData || properties.length === 0) {
      console.log('[Matching] Cache miss - fetching properties from Airtable...');
      const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
      if (!propertiesRes.ok) {
        const errorText = await propertiesRes.text();
        console.error('[Matching] Failed to fetch properties:', propertiesRes.status, errorText);
        throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
      }
      const directPropertiesData = await propertiesRes.json();
      properties = directPropertiesData.records || [];
    }
    console.log(`[Matching] Loaded ${properties.length} properties in ${Date.now() - startTime}ms`);

    if (buyers.length === 0 || properties.length === 0) {
      console.warn('[Matching] No buyers or properties found, skipping matching');
      return res.status(200).json({
        success: true,
        message: 'No buyers or properties found to match',
        stats: { buyersProcessed: 0, propertiesProcessed: 0, matchesCreated: 0, matchesUpdated: 0, duplicatesSkipped: 0, withinRadius: 0 },
      });
    }

    console.log(`[Matching] Processing ${buyers.length} buyers × ${properties.length} properties = ${buyers.length * properties.length} combinations`);

    // Load existing matches into memory
    const { skipSet, matchMap } = await fetchExistingMatches(headers, refreshAll);

    let duplicatesSkipped = 0;
    let withinRadius = 0;

    // Collect matches to create/update in memory
    const matchesToCreate: any[] = [];
    const matchesToUpdate: any[] = [];

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
        if (skipSet.has(pairKey) && !refreshAll) {
          duplicatesSkipped++;
          continue;
        }

        // Generate match score
        const score = generateMatchScore(buyer, property);

        if (score.score >= minScore) {
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

          // Check if this is an update or create
          const existingMatchId = matchMap.get(pairKey);
          if (existingMatchId) {
            // Queue for batch update
            matchesToUpdate.push({
              id: existingMatchId,
              fields: matchFields,
            });
          } else {
            // Queue for batch create
            matchFields['Property Code'] = [property.id];
            matchFields['Contact ID'] = [buyer.id];
            matchesToCreate.push({
              fields: matchFields,
            });
          }

          if (score.isPriority) {
            withinRadius++;
          }
        }
      }
    }

    // Execute batch operations
    console.log(`[Matching] Executing batch operations: ${matchesToCreate.length} creates, ${matchesToUpdate.length} updates`);
    const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
    const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

    // Invalidate matches cache if we created or updated any matches
    if (matchesCreated > 0 || matchesUpdated > 0) {
      console.log('[Matching] Invalidating matches cache due to changes...');
      await invalidateCache('matches', headers);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Matching] Completed in ${totalTime}ms`, {
      matchesCreated,
      matchesUpdated,
      duplicatesSkipped,
      withinRadius,
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

  // Try to fetch buyers from cache first
  console.log('[Matching] Attempting to fetch buyers from cache...');
  let buyersData = await fetchCachedData('buyers', headers);
  let allBuyers = buyersData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!buyersData || allBuyers.length === 0) {
    console.log('[Matching] Cache miss - fetching buyer from Airtable...');
    const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
    const buyerRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
      { headers }
    );
    if (!buyerRes.ok) throw new Error('Failed to fetch buyer');
    const buyerData = await buyerRes.json();
    allBuyers = buyerData.records || [];
  }

  // Find the specific buyer by contactId
  const buyer = allBuyers.find((b: any) => b.id === contactId || b.fields['Contact ID'] === contactId);

  if (!buyer) {
    return res.status(404).json({ error: 'Buyer not found' });
  }

  // Try to fetch properties from cache first
  console.log('[Matching] Attempting to fetch properties from cache...');
  let propertiesData = await fetchCachedData('properties', headers);
  let properties = propertiesData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!propertiesData || properties.length === 0) {
    console.log('[Matching] Cache miss - fetching properties from Airtable...');
    const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
    if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
    const directPropertiesData = await propertiesRes.json();
    properties = directPropertiesData.records || [];
  }

  // Load existing matches for this buyer
  const { matchMap } = await fetchExistingMatches(headers, false);

  const matchesToCreate: any[] = [];
  const matchesToUpdate: any[] = [];
  let withinRadius = 0;

  // Match against all properties
  for (const property of properties) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      // Build match notes
      let matchNotes = score.reasoning;
      matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
      if (score.concerns && score.concerns.length > 0) {
        matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
      }

      const matchFields: any = {
        'Match Score': score.score,
        'Match Notes': matchNotes,
        'Match Status': 'Active',
        'Priority': score.isPriority,
      };

      const pairKey = `${buyer.id}:${property.id}`;
      const existingMatchId = matchMap.get(pairKey);

      if (existingMatchId) {
        matchesToUpdate.push({ id: existingMatchId, fields: matchFields });
      } else {
        matchFields['Property Code'] = [property.id];
        matchFields['Contact ID'] = [buyer.id];
        matchesToCreate.push({ fields: matchFields });
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  // Execute batch operations
  const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
  const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

  // Invalidate matches cache if we created or updated any matches
  if (matchesCreated > 0 || matchesUpdated > 0) {
    console.log('[Matching] Invalidating matches cache due to changes...');
    await invalidateCache('cache:matches', headers);
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

  // Try to fetch properties from cache first
  console.log('[Matching] Attempting to fetch properties from cache...');
  let propertiesData = await fetchCachedData('properties', headers);
  let allProperties = propertiesData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!propertiesData || allProperties.length === 0) {
    console.log('[Matching] Cache miss - fetching property from Airtable...');
    const propertyFormula = encodeURIComponent(`{Property Code} = "${propertyCode}"`);
    const propertyRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${propertyFormula}`,
      { headers }
    );
    if (!propertyRes.ok) throw new Error('Failed to fetch property');
    const propertyData = await propertyRes.json();
    allProperties = propertyData.records || [];
  }

  // Find the specific property by propertyCode
  const property = allProperties.find((p: any) => p.id === propertyCode || p.fields['Property Code'] === propertyCode);

  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  // Try to fetch buyers from cache first
  console.log('[Matching] Attempting to fetch buyers from cache...');
  let buyersData = await fetchCachedData('buyers', headers);
  let buyers = buyersData?.records || [];

  // Fallback to direct Airtable query if cache unavailable
  if (!buyersData || buyers.length === 0) {
    console.log('[Matching] Cache miss - fetching buyers from Airtable...');
    const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
    if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
    const directBuyersData = await buyersRes.json();
    buyers = directBuyersData.records || [];
  }

  // Load existing matches for this property
  const { matchMap } = await fetchExistingMatches(headers, false);

  const matchesToCreate: any[] = [];
  const matchesToUpdate: any[] = [];
  let withinRadius = 0;

  // Match against all buyers
  for (const buyer of buyers) {
    const score = generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      // Build match notes
      let matchNotes = score.reasoning;
      matchNotes += `\n\nHighlights: ${score.highlights.join(', ')}`;
      if (score.concerns && score.concerns.length > 0) {
        matchNotes += `\n\nConcerns: ${score.concerns.join(', ')}`;
      }

      const matchFields: any = {
        'Match Score': score.score,
        'Match Notes': matchNotes,
        'Match Status': 'Active',
        'Priority': score.isPriority,
      };

      const pairKey = `${buyer.id}:${property.id}`;
      const existingMatchId = matchMap.get(pairKey);

      if (existingMatchId) {
        matchesToUpdate.push({ id: existingMatchId, fields: matchFields });
      } else {
        matchFields['Property Code'] = [property.id];
        matchFields['Contact ID'] = [buyer.id];
        matchesToCreate.push({ fields: matchFields });
      }

      if (score.isPriority) {
        withinRadius++;
      }
    }
  }

  // Execute batch operations
  const matchesCreated = await batchCreateMatches(matchesToCreate, headers);
  const matchesUpdated = await batchUpdateMatches(matchesToUpdate, headers);

  // Invalidate matches cache if we created or updated any matches
  if (matchesCreated > 0 || matchesUpdated > 0) {
    console.log('[Matching] Invalidating matches cache due to changes...');
    await invalidateCache('cache:matches', headers);
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

