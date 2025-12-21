/**
 * Zillow Search API Endpoint
 * Searches Zillow for properties matching a buyer's criteria via Apify
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runZillowSearch, determineSearchType } from '@/lib/apify';
import type { ZillowSearchResponse, ZillowSearchType } from '@/types/zillow';
import type { BuyerCriteria } from '@/types/matching';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { buyerId } = req.query;

  if (!buyerId || typeof buyerId !== 'string') {
    return res.status(400).json({ error: 'buyerId required' });
  }

  try {
    // Fetch buyer from Airtable
    const headers = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };
    const buyerRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${buyerId}`,
      { headers }
    );

    if (!buyerRes.ok) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    const buyerData = await buyerRes.json();
    const buyer: BuyerCriteria = {
      contactId: buyerData.fields['Contact ID'],
      recordId: buyerData.id,
      firstName: buyerData.fields['First Name'] || '',
      lastName: buyerData.fields['Last Name'] || '',
      email: buyerData.fields['Email'] || '',
      city: buyerData.fields['City'],
      state: buyerData.fields['State'],
      preferredLocation: buyerData.fields['Preferred Location'],
      desiredBeds: buyerData.fields['No. of Bedrooms'],
      desiredBaths: buyerData.fields['No. of Bath'],
      downPayment: buyerData.fields['Downpayment'],
      location: buyerData.fields['City'] || buyerData.fields['State'],
    };

    // Check if buyer has sufficient location data
    if (!buyer.city && !buyer.preferredLocation && !buyer.location) {
      return res.json({
        results: [],
        searchType: 'Keywords' as ZillowSearchType,
        buyerCriteria: {
          location: '',
          beds: buyer.desiredBeds || 0,
          maxPrice: 0,
        },
        apifyRunId: '',
        totalResults: 0,
        message: 'Buyer location required for Zillow search',
      });
    }

    // Determine search type based on buyer data
    const searchType = determineSearchType(buyer);

    console.log(`[Zillow Search] Starting search for buyer ${buyer.firstName} ${buyer.lastName} (${searchType})`);

    // Run Zillow search via Apify
    const results = await runZillowSearch(buyer, searchType);

    const response: ZillowSearchResponse = {
      results,
      searchType,
      buyerCriteria: {
        location: buyer.preferredLocation || buyer.city || buyer.location || '',
        beds: buyer.desiredBeds || 0,
        maxPrice: buyer.downPayment ? buyer.downPayment * 5 : 0,
      },
      apifyRunId: 'run-id', // TODO: track actual run ID from Apify
      totalResults: results.length,
    };

    return res.json(response);
  } catch (error) {
    console.error('[Zillow Search Error]', error);
    return res.status(500).json({
      error: 'Zillow search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
