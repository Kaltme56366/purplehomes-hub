/**
 * Clear All Matches API Endpoint
 *
 * Deletes all records from the Property-Buyer Matches table
 * This is needed to clean up matches with wrong Contact IDs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Clear Matches API] Request:', req.method);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  try {
    // Step 1: Fetch all match record IDs
    console.log('[Clear Matches] Fetching all match records...');

    let allRecordIds: string[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('fields[]', 'Match Score'); // Just need IDs, minimal field
      if (offset) url.searchParams.set('offset', offset);

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }

      const data = await response.json();
      const recordIds = (data.records || []).map((r: any) => r.id);
      allRecordIds.push(...recordIds);
      offset = data.offset;

      console.log(`[Clear Matches] Fetched ${recordIds.length} records (total: ${allRecordIds.length})`);
    } while (offset);

    if (allRecordIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matches to delete',
        deletedCount: 0,
      });
    }

    console.log(`[Clear Matches] Total records to delete: ${allRecordIds.length}`);

    // Step 2: Delete in batches of 10 (Airtable limit)
    const BATCH_SIZE = 10;
    let deletedCount = 0;

    for (let i = 0; i < allRecordIds.length; i += BATCH_SIZE) {
      const batch = allRecordIds.slice(i, i + BATCH_SIZE);

      // Build URL with record IDs as query params
      const deleteUrl = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`);
      batch.forEach(id => deleteUrl.searchParams.append('records[]', id));

      const deleteRes = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers,
      });

      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        console.error(`[Clear Matches] Delete batch failed:`, errorText);
        throw new Error(`Failed to delete batch: ${deleteRes.status}`);
      }

      deletedCount += batch.length;
      console.log(`[Clear Matches] Deleted ${deletedCount}/${allRecordIds.length} records`);
    }

    console.log(`[Clear Matches] Successfully deleted all ${deletedCount} matches`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} matches`,
      deletedCount,
    });

  } catch (error) {
    console.error('[Clear Matches] Error:', error);
    return res.status(500).json({
      error: 'Failed to clear matches',
      details: String(error),
    });
  }
}
