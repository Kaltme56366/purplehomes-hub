import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  const { cacheKey } = req.query;
  const validKeys = ['properties', 'buyers', 'matches', 'all'];

  if (!cacheKey || !validKeys.includes(cacheKey as string)) {
    return res.status(400).json({ error: 'Invalid cacheKey. Use: properties, buyers, matches, or all' });
  }

  try {
    const results: Record<string, any> = {};

    if (cacheKey === 'properties' || cacheKey === 'all') {
      results.properties = await syncProperties();
    }

    if (cacheKey === 'buyers' || cacheKey === 'all') {
      results.buyers = await syncBuyers();
    }

    if (cacheKey === 'matches' || cacheKey === 'all') {
      results.matches = await syncMatches();
    }

    return res.status(200).json({
      success: true,
      syncedAt: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: 'Sync failed', details: String(error) });
  }
}

async function fetchAllRecords(tableName: string, fields?: string[]): Promise<any[]> {
  const allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    if (fields) {
      fields.forEach(f => url.searchParams.append('fields[]', f));
    }
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    allRecords.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return allRecords;
}

async function updateCache(cacheKey: string, data: any, recordCount: number): Promise<void> {
  // First, try to find existing cache record
  const formula = `{cache_key}="${cacheKey}"`;
  const findRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent('System Cache')}?filterByFormula=${encodeURIComponent(formula)}&fields[]=cache_key`,
    { headers }
  );
  const findData = await findRes.json();
  const recordId = findData.records?.[0]?.id;

  const jsonData = JSON.stringify(data);
  const dataSize = jsonData.length;
  console.log(`[Sync] Cache data size for ${cacheKey}: ${dataSize} characters (${(dataSize / 1024).toFixed(2)} KB)`);

  if (dataSize > 100000) {
    console.warn(`[Sync] WARNING: Cache data for ${cacheKey} exceeds Airtable's 100KB limit! Size: ${dataSize}`);
  }

  const cacheFields = {
    cache_key: cacheKey,
    data: jsonData,
    record_count: recordCount,
    source_count: recordCount,
    last_synced: new Date().toISOString(),
    is_valid: true,
    version: 1,
  };

  if (recordId) {
    // Update existing record
    console.log(`[Sync] Updating existing cache record for ${cacheKey} (recordId: ${recordId})`);
    const updateRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent('System Cache')}/${recordId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: cacheFields,
        }),
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error(`[Sync] Failed to update cache for ${cacheKey}:`, errorText);
      throw new Error(`Failed to update cache: ${errorText}`);
    }

    const result = await updateRes.json();
    console.log(`[Sync] Successfully updated cache for ${cacheKey}. Record ID: ${result.id}`);
  } else {
    // Create new record
    console.log(`[Sync] Creating new cache record for ${cacheKey}`);
    const createRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent('System Cache')}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: cacheFields,
        }),
      }
    );

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error(`[Sync] Failed to create cache for ${cacheKey}:`, errorText);
      throw new Error(`Failed to create cache: ${errorText}`);
    }

    const result = await createRes.json();
    console.log(`[Sync] Successfully created cache for ${cacheKey}. Record ID: ${result.id}`);
  }
}

async function syncProperties() {
  console.log('Syncing properties cache...');

  const records = await fetchAllRecords('Properties');

  // Store the full Airtable record structure with 'fields' property
  // This matches what the matching algorithm expects
  const cacheData = {
    records: records,  // Keep original Airtable structure!
  };

  await updateCache('properties', cacheData, records.length);

  return { recordCount: records.length };
}

async function syncBuyers() {
  console.log('Syncing buyers cache...');

  const records = await fetchAllRecords('Buyers');

  // Store the full Airtable record structure with 'fields' property
  // This matches what the matching algorithm expects
  const cacheData = {
    records: records,  // Keep original Airtable structure!
  };

  await updateCache('buyers', cacheData, records.length);

  return { recordCount: records.length };
}

async function syncMatches() {
  console.log('Syncing matches cache...');

  const records = await fetchAllRecords('Property-Buyer Matches');

  // Build indexes for fast lookup (keep the indexes!)
  const buyerIndex: Record<string, string[]> = {};
  const propertyIndex: Record<string, string[]> = {};

  records.forEach(r => {
    const buyerRecordId = r.fields['Contact ID']?.[0] || '';
    const propertyRecordId = r.fields['Property Code']?.[0] || '';

    // Build buyer index
    if (buyerRecordId) {
      if (!buyerIndex[buyerRecordId]) buyerIndex[buyerRecordId] = [];
      buyerIndex[buyerRecordId].push(r.id);
    }

    // Build property index
    if (propertyRecordId) {
      if (!propertyIndex[propertyRecordId]) propertyIndex[propertyRecordId] = [];
      propertyIndex[propertyRecordId].push(r.id);
    }
  });

  // Store the full Airtable record structure with 'fields' property
  const cacheData = {
    records: records,  // Keep original Airtable structure!
    buyerIndex,
    propertyIndex,
  };

  await updateCache('matches', cacheData, records.length);

  return { recordCount: records.length };
}
