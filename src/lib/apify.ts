/**
 * Apify Client for Zillow Property Search
 * Integrates with Apify's jupri~zillow-scraper to find external property listings
 */

import { ApifyClient } from 'apify-client';
import type { BuyerCriteria } from '@/types/matching';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';

// Initialize Apify client
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const ZILLOW_ACTOR_ID = 'jupri~zillow-scraper';

/**
 * Run Zillow search via Apify for a specific buyer and search type
 *
 * @param buyer - Buyer criteria including location and preferences
 * @param searchType - Type of search to perform
 * @param maxPrice - Optional max price override (for Affordability search)
 * @returns Object containing listings array and Apify run ID
 */
export async function runZillowSearch(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType,
  maxPrice?: number
): Promise<{ listings: ZillowListing[], runId: string }> {
  const input = buildApifyInput(buyer, searchType, maxPrice);

  console.log('[Apify] Running Zillow search:', { searchType, location: input.location, input });

  try {
    const run = await client.actor(ZILLOW_ACTOR_ID).call(input, {
      memory: 8192, // Specify memory in call options
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Apify] Zillow search completed: ${items.length} results, runId: ${run.id}`);

    return {
      listings: items.map(transformApifyResult),
      runId: run.id,
    };
  } catch (error) {
    console.error('[Apify] Zillow search failed:', error);
    throw new Error('Zillow search failed');
  }
}

/**
 * Build Apify input based on buyer criteria and search type
 */
function buildApifyInput(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType,
  maxPrice?: number
) {
  const location = buyer.preferredLocation || buyer.city || buyer.location || '';
  const minBeds = buyer.desiredBeds || null;

  const baseInput = {
    location: [location], // Apify expects array
    search_type: 'sale' as const, // All searches are for sale properties
    maxResults: 20,
  };

  if (searchType === 'Creative Financing') {
    return {
      ...baseInput,
      min_beds: minBeds,
      prompt: 'seller finance OR owner finance OR bond for deed',
    };
  }

  if (searchType === '90+ Days') {
    return {
      ...baseInput,
      min_beds: minBeds,
      max_price: 275000,
      max_days: 90, // Properties on market 90+ days
      status: ['fsba', 'fsbo', 'foreclosure', 'foreclosed', 'preforeclosure'],
      types: ['singleFamily'],
    };
  }

  if (searchType === 'Affordability') {
    return {
      ...baseInput,
      min_beds: minBeds,
      max_price: maxPrice, // Calculated max price from affordability formula
    };
  }

  // Fallback - should not reach here
  return baseInput;
}

/**
 * Transform Apify result item to ZillowListing format
 */
function transformApifyResult(item: any): ZillowListing {
  return {
    zpid: item.zpid || item.id || String(Math.random()),
    address: item.address || item.streetAddress || '',
    city: item.city || '',
    state: item.state || '',
    zipCode: item.zipcode || item.zip || '',
    price: item.price || 0,
    beds: item.bedrooms || item.beds || 0,
    baths: item.bathrooms || item.baths || 0,
    sqft: item.livingArea || item.sqft || item.squareFeet,
    propertyType: item.propertyType || 'SINGLE_FAMILY',
    description: item.description || '',
    images: item.photos || item.images || [],
    zillowUrl: item.url || (item.zpid ? `https://www.zillow.com/homedetails/${item.zpid}_zpid/` : ''),
    daysOnMarket: item.daysOnZillow || item.dom,
    lat: item.latitude || item.lat || 0,
    lng: item.longitude || item.lng || 0,
    scrapedAt: new Date().toISOString(),
    listingAgent: item.listingAgent || item.agent ? {
      name: item.listingAgent?.name || item.agent?.name || 'Unknown',
      phone: item.listingAgent?.phone || item.agent?.phone || '',
    } : undefined,
  };
}
