/**
 * Check Zillow Property API Endpoint
 * Checks if a Zillow property (by ZPID) already exists in the system
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { zpid } = req.query;

  if (!zpid || typeof zpid !== 'string') {
    return res.status(400).json({ error: 'zpid required' });
  }

  try {
    const headers = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };
    const filterFormula = encodeURIComponent(`{Zillow ZPID} = "${zpid}"`);

    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${filterFormula}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Airtable query failed');
    }

    const data = await response.json();

    return res.json({
      exists: data.records?.length > 0,
      propertyId: data.records?.[0]?.id || null,
      propertyCode: data.records?.[0]?.fields?.['Property Code'] || null,
    });
  } catch (error) {
    console.error('[Check Zillow Error]', error);
    return res.status(500).json({
      error: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
