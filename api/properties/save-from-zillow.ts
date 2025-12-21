/**
 * Save Zillow Property API Endpoint
 * Saves an external Zillow property to the system (Airtable + GHL)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing, buyerId, stage, notes, zillowType }: {
    listing: ZillowListing;
    buyerId: string;
    stage: string;
    notes?: string;
    zillowType: ZillowSearchType;
  } = req.body;

  if (!listing || !buyerId || !stage || !zillowType) {
    return res.status(400).json({
      error: 'Missing required fields: listing, buyerId, stage, zillowType',
    });
  }

  const headers = {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Check if ZPID already exists (prevent duplicates)
    const existingQuery = encodeURIComponent(`{Zillow ZPID} = "${listing.zpid}"`);
    const checkRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${existingQuery}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.records?.length > 0) {
      return res.status(409).json({
        error: 'Property already saved',
        propertyId: checkData.records[0].id,
        message: 'This Zillow property is already in your system',
      });
    }

    // Step 2: Generate property code
    const propertyCode = `ZIL-${listing.zpid}`;

    // Step 3: Create property in Airtable
    console.log(`[Save Zillow] Creating property: ${listing.address}`);

    const createRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: {
            'Property Code': propertyCode,
            'Address': listing.address,
            'City': listing.city,
            'State': listing.state,
            'Zip Code': listing.zipCode,
            'Price': listing.price,
            'Beds': listing.beds,
            'Baths': listing.baths,
            'Sqft': listing.sqft,
            'Stage': stage,
            'Hero Image': listing.images[0] || '',
            'Notes': notes || listing.description || '',
            'Source': 'Zillow',
            'Zillow Type': zillowType,
            'Zillow ZPID': listing.zpid,
            'Zillow URL': listing.zillowUrl,
            'Days on Market': listing.daysOnMarket,
            'Lat': listing.lat,
            'Lng': listing.lng,
          },
        }),
      }
    );

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error('[Save Zillow] Airtable error:', errorData);
      throw new Error(`Failed to create property: ${errorData.error?.message || 'Unknown error'}`);
    }

    const propertyData = await createRes.json();

    console.log(`[Save Zillow] Property created successfully: ${propertyData.id}`);

    return res.json({
      success: true,
      property: propertyData,
      matchCreated: false, // TODO: Optionally create initial match with buyer
      message: `Saved ${listing.address} to system`,
    });
  } catch (error) {
    console.error('[Save Zillow Error]', error);
    return res.status(500).json({
      error: 'Failed to save property',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
