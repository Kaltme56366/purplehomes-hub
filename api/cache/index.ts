import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// Table names
const CACHE_TABLE = 'System Cache';
const PROPERTIES_TABLE = 'Properties';
const BUYERS_TABLE = 'Buyers';
const MATCHES_TABLE = 'Property-Buyer Matches';

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  const { action, cacheKey } = req.query;

  try {
    // GET CACHE STATUS - Quick check of all caches + source counts
    if (action === 'status' && req.method === 'GET') {
      // Fetch cache metadata (without full data)
      const cacheRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?fields[]=cache_key&fields[]=record_count&fields[]=source_count&fields[]=last_synced&fields[]=version&fields[]=is_valid`,
        { headers }
      );
      const cacheData = await cacheRes.json();

      // Get current counts from source tables (just counts, not full data)
      const [propertiesCount, buyersCount, matchesCount] = await Promise.all([
        getTableCount(PROPERTIES_TABLE),
        getTableCount(BUYERS_TABLE),
        getTableCount(MATCHES_TABLE),
      ]);

      // Build status response
      const cacheRecords = cacheData.records || [];
      const status = {
        properties: extractCacheMetadata(cacheRecords, 'properties', propertiesCount),
        buyers: extractCacheMetadata(cacheRecords, 'buyers', buyersCount),
        matches: extractCacheMetadata(cacheRecords, 'matches', matchesCount),
        lastChecked: new Date().toISOString(),
      };

      // Calculate new available
      status.newPropertiesAvailable = Math.max(0, propertiesCount - status.properties.recordCount);
      status.newBuyersAvailable = Math.max(0, buyersCount - status.buyers.recordCount);
      status.isStale = !status.properties.isValid || !status.buyers.isValid ||
                       status.newPropertiesAvailable > 0 || status.newBuyersAvailable > 0;

      return res.status(200).json(status);
    }

    // GET CACHED DATA - Returns full cached dataset
    if (action === 'get' && req.method === 'GET' && cacheKey) {
      const formula = `{cache_key}="${cacheKey}"`;
      const cacheRes = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CACHE_TABLE)}?filterByFormula=${encodeURIComponent(formula)}`,
        { headers }
      );
      const cacheData = await cacheRes.json();
      const record = cacheData.records?.[0];

      if (!record) {
        return res.status(404).json({ error: `Cache not found: ${cacheKey}` });
      }

      // Parse the JSON data field
      let parsedData = { records: [] };
      try {
        parsedData = JSON.parse(record.fields.data || '{"records":[]}');
      } catch (e) {
        console.error('Failed to parse cache data:', e);
      }

      return res.status(200).json({
        cacheKey: record.fields.cache_key,
        data: parsedData,
        recordCount: record.fields.record_count || 0,
        sourceCount: record.fields.source_count || 0,
        lastSynced: record.fields.last_synced || null,
        version: record.fields.version || 1,
        isValid: record.fields.is_valid || false,
        airtableRecordId: record.id,
      });
    }

    return res.status(400).json({ error: 'Invalid action or method' });

  } catch (error) {
    console.error('Cache API error:', error);
    return res.status(500).json({ error: 'Cache operation failed', details: String(error) });
  }
}

async function getTableCount(tableName: string): Promise<number> {
  // Airtable doesn't have a direct count endpoint, so we fetch with minimal fields
  // and use pagination to count. For better performance, consider storing counts separately.
  let count = 0;
  let offset: string | undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('fields[]', 'Created'); // Minimal field
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    count += (data.records || []).length;
    offset = data.offset;
  } while (offset);

  return count;
}

function extractCacheMetadata(records: any[], key: string, sourceCount: number) {
  const record = records.find(r => r.fields.cache_key === key);
  return {
    cacheKey: key,
    recordCount: record?.fields.record_count || 0,
    sourceCount: sourceCount,
    lastSynced: record?.fields.last_synced || null,
    version: record?.fields.version || 1,
    isValid: record?.fields.is_valid || false,
  };
}
