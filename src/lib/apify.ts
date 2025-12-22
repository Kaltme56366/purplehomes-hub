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
 * Map internal property type to Zillow property type
 */
function mapPropertyTypeToZillow(propertyType: string): string | undefined {
  const mapping: Record<string, string> = {
    'Single Family': 'SINGLE_FAMILY',
    'Condo': 'CONDO',
    'Town House': 'TOWNHOUSE',
    'Townhouse': 'TOWNHOUSE',
    'Multi Family': 'MULTI_FAMILY',
    'Duplex': 'MULTI_FAMILY',
    'Triplex': 'MULTI_FAMILY',
    '4-plex': 'MULTI_FAMILY',
    'Mobile Home': 'MOBILE',
    'Lot': 'LAND',
    'Land': 'LAND',
  };
  return mapping[propertyType];
}

/**
 * Build Apify input based on buyer criteria and search type
 */
function buildApifyInput(
  buyer: BuyerCriteria,
  searchType: ZillowSearchType,
  maxPrice?: number
): Record<string, any> {
  const location = buyer.preferredLocation || buyer.city || buyer.location || '';

  // Convert to string enums as required by the actor
  const minBeds = buyer.desiredBeds ? String(buyer.desiredBeds) : undefined;
  const minBaths = buyer.desiredBaths ? String(buyer.desiredBaths) : undefined;

  // Build base input with corrected parameter names
  const baseInput: Record<string, any> = {
    location: [location],           // Array format required
    search_type: 'sale',            // Correct enum value (not 'sell')
    limit: 20,                      // Correct param name (not 'maxResults')
  };

  // Always include beds filter if available
  if (minBeds) {
    baseInput.min_beds = minBeds;
  }

  // Always include baths filter if available
  if (minBaths) {
    baseInput.min_baths = minBaths;
  }

  // Add property type filter if available
  const buyerWithPrefs = buyer as any; // Extended buyer type
  if (buyerWithPrefs.preferences?.propertyType) {
    const zillowType = mapPropertyTypeToZillow(buyerWithPrefs.preferences.propertyType);
    if (zillowType) {
      baseInput.types = [zillowType];
    }
  }

  // Add sqft filter if available
  if (buyerWithPrefs.preferences?.sqft) {
    baseInput.min_area = buyerWithPrefs.preferences.sqft;
  }

  // Search type specific configurations
  if (searchType === 'Creative Financing') {
    return {
      ...baseInput,
      prompt: 'seller finance OR owner finance OR bond for deed',
    };
  }

  if (searchType === '90+ Days') {
    return {
      ...baseInput,
      min_days: 90,           // Correct filter for 90+ days on market
      max_price: 275000,
      sort: 'newest',         // Valid sort option
    };
  }

  if (searchType === 'Affordability') {
    return {
      ...baseInput,
      max_price: maxPrice,    // Calculated from buyer's down payment
    };
  }

  // Fallback
  return baseInput;
}

/**
 * Transform Apify result item to ZillowListing format
 */
function transformApifyResult(item: any): ZillowListing {
  // Handle address - can be string or object with {streetAddress, city, state, zipcode}
  const addressObj = item.address;
  const streetAddress = typeof addressObj === 'object' && addressObj
    ? addressObj.streetAddress || ''
    : (item.streetAddress || item.address || '');
  const city = typeof addressObj === 'object' && addressObj
    ? addressObj.city || ''
    : (item.city || '');
  const state = typeof addressObj === 'object' && addressObj
    ? addressObj.state || ''
    : (item.state || '');
  const zipCode = typeof addressObj === 'object' && addressObj
    ? addressObj.zipcode || ''
    : (item.zipcode || item.zip || '');

  return {
    zpid: item.zpid || item.id || String(Math.random()),
    address: streetAddress,
    city,
    state,
    zipCode,
    price: item.price || 0,
    beds: item.bedrooms || item.beds || 0,
    baths: item.bathrooms || item.baths || 0,
    sqft: item.livingArea || item.sqft || item.squareFeet,
    propertyType: item.propertyType || item.homeType || 'SINGLE_FAMILY',
    description: item.description || '',
    images: item.photos || item.images || item.imgSrc ? [item.imgSrc] : [],
    zillowUrl: item.url || item.detailUrl || (item.zpid ? `https://www.zillow.com/homedetails/${item.zpid}_zpid/` : ''),
    daysOnMarket: item.daysOnZillow || item.dom || item.timeOnZillow,
    lat: item.latitude || item.lat || 0,
    lng: item.longitude || item.lng || 0,
    scrapedAt: new Date().toISOString(),
    listingAgent: item.listingAgent || item.brokerName ? {
      name: item.listingAgent?.name || item.brokerName || 'Unknown',
      phone: item.listingAgent?.phone || '',
    } : undefined,
  };
}
