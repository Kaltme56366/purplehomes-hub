/**
 * Apify Client for Zillow Property Search
 * Integrates with Apify's Zillow scraper to find external property listings
 */

import { ApifyClient } from 'apify-client';
import type { BuyerCriteria } from '@/types/matching';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';

// Initialize Apify client
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const ZILLOW_ACTOR_ID = 'apify/zillow-api-scraper';

/**
 * Run Zillow search via Apify for a specific buyer
 */
export async function runZillowSearch(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType
): Promise<ZillowListing[]> {
  const input = buildApifyInput(buyer, searchType);

  console.log('[Apify] Running Zillow search:', { searchType, location: input.search });

  try {
    const run = await client.actor(ZILLOW_ACTOR_ID).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Apify] Zillow search completed: ${items.length} results`);

    return items.map(transformApifyResult);
  } catch (error) {
    console.error('[Apify] Zillow search failed:', error);
    throw new Error('Zillow search failed');
  }
}

/**
 * Build Apify input based on buyer criteria and search type
 */
function buildApifyInput(buyer: BuyerCriteria, searchType: ZillowSearchType) {
  const baseInput = {
    search: buyer.preferredLocation || buyer.city || buyer.location || '',
    maxResults: 20,
    searchType: 'for_sale' as const,
  };

  if (searchType === 'Formula' && buyer.desiredBeds && buyer.downPayment) {
    // Use buyer's criteria to filter results
    return {
      ...baseInput,
      minBeds: buyer.desiredBeds,
      maxPrice: buyer.downPayment ? buyer.downPayment * 5 : undefined, // Rough estimate (20% down)
    };
  }

  if (searchType === 'DOM') {
    // Search for properties that have been on market longer
    return {
      ...baseInput,
      // Note: Apify actor may not directly support DOM filtering
      // This would need to be filtered post-scrape
    };
  }

  // Keywords search - use location as-is
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
  };
}

/**
 * Determine best search type based on available buyer data
 */
export function determineSearchType(buyer: BuyerCriteria): ZillowSearchType {
  // Priority 1: Keywords search (if buyer has detailed preferred location)
  if (buyer.preferredLocation && buyer.preferredLocation.length > 10) {
    return 'Keywords';
  }

  // Priority 2: Formula search (if we have beds, price, and location)
  if (buyer.desiredBeds && buyer.downPayment && (buyer.city || buyer.location)) {
    return 'Formula';
  }

  // Priority 3: DOM search as fallback
  return 'DOM';
}
